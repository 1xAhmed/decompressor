const { trim0x } = require('@1inch/solidity-utils');

class CompressDataDescription {
    constructor(startByte, amountBytes, method) {
        this.startByte = startByte;
        this.amountBytes = amountBytes;
        this.method = method;
    }
}

class CompressDataPower {
    constructor(decompressedBytesAmount, compressedBytesAmount) {
        this.decompressedSize = decompressedBytesAmount;
        this.compressedSize = compressedBytesAmount;
    }

    range() {
        return this.decompressedSize - this.compressedSize;
    }

    add(c) {
        this.decompressedSize += c.decompressedSize;
        this.compressedSize += c.compressedSize;
    }
}

class CompressData {
    constructor(power, description) {
        this.power = power;
        this.description = description;
    }
}

class Calldata {
    constructor(data) {
        data = trim0x(data);
        const dataTrim0 = data.replace(/^0+/, '').toLowerCase();
        if (BigInt('0x' + data).toString(16) !== (dataTrim0 === '' ? '0' : dataTrim0)) {
            throw Error('The data is not hexadecimal');
        }
        if (data.length % 2 !== 0) {
            throw Error('Wrong data length');
        }
        this.data = data;
        this.bytesInfo = [];
    }

    analyse() {
        this.bytesInfo = [];
        for (let i = 0; i < this.data.length; i += 2) {
            this.bytesInfo.push({
                index: i / 2,
                zeroCompress: this.checkZerosCase(i / 2),
                copyCompress: this.checkCopyCaseWithZeros(i / 2),
            });
        }
        return this.bytesInfo;
    }

    #compressPart(fromByte, toByte) {
        function createDesc(arrayDesc, amountBytes, method) {
            let startByte = fromByte;
            if (arrayDesc.length !== 0) {
                const prevDescIndex = arrayDesc.length - 1;
                startByte = arrayDesc[prevDescIndex].startByte + arrayDesc[prevDescIndex].amountBytes;
            }
            return new CompressDataDescription(
                startByte,
                amountBytes,
                method,
            );
        }

        function addJustCopyCompress(resultCompress, amount) {
            if (amount !== 0) {
                resultCompress.power.add(new CompressDataPower(amount, 1 + amount));
                resultCompress.description.push(
                    createDesc(resultCompress.description, amount, '01'),
                );
            }
            return resultCompress;
        }

        let partCompress = new CompressData(
            new CompressDataPower(0, 0),
            [],
        );

        let justCopyAmount = 0;
        for (let i = fromByte; i <= toByte;) {
            if (this.bytesInfo[i].zeroCompress.decompressedSize >= toByte - i + 1) {
                partCompress = addJustCopyCompress(partCompress, justCopyAmount);
                partCompress.power.add(new CompressDataPower(toByte - fromByte + 1, 1));
                partCompress.description.push(
                    new CompressDataDescription(
                        i,
                        toByte - i + 1,
                        '00',
                    ),
                );
                return partCompress;
            }

            let zeroBytesAmount = 0;
            let isPaddingWithCopy = false;
            let needJustCopyAmount = true;

            if (this.bytesInfo[i].zeroCompress.decompressedSize !== 0) {
                if (this.bytesInfo[i].copyCompress.decompressedSize >= toByte - i + 1 ||
                    this.bytesInfo[i].zeroCompress.range() > this.bytesInfo[i].copyCompress.range()) {
                    zeroBytesAmount = this.bytesInfo[i].zeroCompress.decompressedSize;
                } else {
                    isPaddingWithCopy = true;
                }
            }

            let isCopyCompressUsed = false;
            const isZeroCompress = zeroBytesAmount > 0;
            if (isZeroCompress || isPaddingWithCopy) {
                partCompress = addJustCopyCompress(partCompress, justCopyAmount);
                if (isZeroCompress) {
                    partCompress.power.add(this.bytesInfo[i].zeroCompress);
                    partCompress.description.push(
                        createDesc(
                            partCompress.description,
                            zeroBytesAmount,
                            '00',
                        ),
                    );
                    i += zeroBytesAmount;
                } else if (isPaddingWithCopy) {
                    partCompress.power.add(this.bytesInfo[i].copyCompress);
                    partCompress.description.push(
                        createDesc(
                            partCompress.description,
                            this.bytesInfo[i].copyCompress.decompressedSize,
                            '01',
                        ),
                    );
                    i += this.bytesInfo[i].copyCompress.decompressedSize;
                }
                justCopyAmount = 0;
                needJustCopyAmount = false;
                isCopyCompressUsed = true;
            }

            if (!isCopyCompressUsed) {
                if (needJustCopyAmount) {
                    const newJustCopyAmount = Math.min(this.bytesInfo[i].copyCompress.decompressedSize, toByte - i + 1);
                    justCopyAmount += newJustCopyAmount;
                    if (justCopyAmount > 32) {
                        partCompress = addJustCopyCompress(partCompress, 32);
                        justCopyAmount -= 32;
                    }
                    i += newJustCopyAmount;
                }
            }
        }

        partCompress = addJustCopyCompress(partCompress, justCopyAmount);

        return partCompress;
    }

    zip(instractions) {
        function scaleFraction(fraction) {
            if (fraction.length % 2 !== 0) {
                fraction = '0' + fraction;
            }
            return fraction;
        }

        let result = '0x';
        for (let i = 0; i < instractions.length; i++) {
            switch (instractions[i].method) {
                case '00':
                    // 00XXXXXX
                    result += scaleFraction(BigInt(instractions[i].amountBytes - 1).toString(16));
                    break;
                case '01': {
                    // 01PXXXXX
                    result += scaleFraction(BigInt(instractions[i].amountBytes - 1 + 64).toString(16));
                    result += this.getBytes(instractions[i].startByte, instractions[i].amountBytes);
                    break;
                }
                default:
                    throw Error('Unsupported method: ' + instractions[i].method);
            }
        }
        return result;
    }

    compress() {
        this.analyse();

        const bestCompressForFirstNBytes = [];
        if (this.bytesInfo[0].zeroCompress.decompressedSize !== 0) {
            bestCompressForFirstNBytes[0] = new CompressData(
                new CompressDataPower(1, 1),
                [new CompressDataDescription(0, 1, '00')],
            );
        } else {
            bestCompressForFirstNBytes[0] = new CompressData(
                new CompressDataPower(1, 2),
                [new CompressDataDescription(0, 1, '01')],
            );
        }

        for (let i = 1; i < this.bytesInfo.length; i++) {
            bestCompressForFirstNBytes[i] = new CompressData(
                new CompressDataPower(
                    bestCompressForFirstNBytes[i - 1].power.decompressedSize + 1,
                    bestCompressForFirstNBytes[i - 1].power.compressedSize + 2,
                ),
                [
                    ...bestCompressForFirstNBytes[i - 1].description,
                    new CompressDataDescription(i, 1, '01'),
                ],
            );

            for (let j = i; j >= Math.max(0, i - 63); j--) {
                const partCompress = this.#compressPart(j, i);

                const prefixCompress = new CompressData(
                    new CompressDataPower(0, 0),
                    [],
                );
                if (partCompress.description[0].startByte !== 0) {
                    prefixCompress.power = bestCompressForFirstNBytes[partCompress.description[0].startByte - 1].power;
                    prefixCompress.description = bestCompressForFirstNBytes[partCompress.description[0].startByte - 1].description;
                }

                if (prefixCompress.power.range() + partCompress.power.range() > bestCompressForFirstNBytes[i].power.range()) {
                    bestCompressForFirstNBytes[i] = new CompressData(
                        new CompressDataPower(
                            prefixCompress.power.decompressedSize + partCompress.power.decompressedSize,
                            prefixCompress.power.compressedSize + partCompress.power.compressedSize,
                        ),
                        [...prefixCompress.description, ...partCompress.description],
                    );
                }
            }
        }

        return {
            uncompressedData: '0x' + this.data,
            compressedData: this.zip(bestCompressForFirstNBytes[this.bytesInfo.length - 1].description),
            ...bestCompressForFirstNBytes[this.bytesInfo.length - 1],
        };
    }

    getByte(n) {
        return this.getBytes(n, 1);
    }

    getBytes(start, n = 1) {
        return this.data.slice(2 * start, 2 * (start + n));
    }

    checkZerosCase(n) {
        let currentByteIndex = n;
        const byte = this.getByte(currentByteIndex);
        if (byte !== '00') {
            return new CompressDataPower(0, 0);
        }
        currentByteIndex++;
        while (this.getByte(currentByteIndex) === '00' && currentByteIndex < this.data.length / 2 && currentByteIndex - n <= 63) {
            currentByteIndex++;
        }
        return new CompressDataPower(currentByteIndex - n, 1);
    }

    checkCopyCaseWithZeros(n) {
        let currentByteIndex = n;
        const byte = this.getByte(currentByteIndex);
        if (byte !== '00') {
            return new CompressDataPower(1, 2);
        }
        currentByteIndex++;
        while (this.getByte(currentByteIndex) === '00' && currentByteIndex < this.data.length) {
            if (currentByteIndex - n === 32) {
                return new CompressDataPower(31, 32);
            }
            currentByteIndex++;
        }
        const decompressedBytesAmount = Math.min(this.data.length / 2 - n, 32);
        return new CompressDataPower(decompressedBytesAmount, decompressedBytesAmount === 32 ? 1 + 32 - (currentByteIndex - n + 1) : 1 + decompressedBytesAmount);
    }
}

async function compress(calldata) {
    const calldataObj = new Calldata(calldata);
    return calldataObj.compress();
}

module.exports = {
    compress,
};