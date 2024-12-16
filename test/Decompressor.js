const hre = require('hardhat');
const { ethers } = hre;
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { ether, expect, trim0x } = require('@1inch/solidity-utils');

const CALLDATAS_LIMIT = 1000;

describe('Decompressor', function () {
    async function initContracts () {
        const [addr1, addr2] = await ethers.getSigners();
        const chainId = (await ethers.provider.getNetwork()).chainId;

        const DecompressorContract = await ethers.getContractFactory('DecompressorContractMock');
        const decompressor = await DecompressorContract.deploy();
        await decompressor.waitForDeployment();

        return { addr1, addr2, decompressor, chainId };
    };
    
    async function initContractsAndLoadCalldatas () {
        const { addr1,  addr2, decompressor, chainId } = await initContracts();

        let calldatas = {};
        let compressedDatas = {};
        try {
            calldatas = require('./tx-calldata.json');
            compressedDatas = require('./compressed-calldata.json');

        } catch (e) {
            console.warn('\x1b[33m%s\x1b[0m', 'Warning: ', 'There is no tx-calldata.json or compressed-calldatas.json');
        }

        return { addr1,  addr2, decompressor, chainId, calldatas, compressedDatas };
    };

    describe('Decompress', function () {
        it('should decompress zero bytes', async function () {
            const { addr1, decompressor } = await loadFixture(initContractsAndLoadCalldatas);
            const calldata = '0x00000000';
            const compress = '0x03'
            const decompressedCalldata = await ethers.provider.call({
                to: decompressor,
                data: decompressor.interface.encodeFunctionData('decompressed') + trim0x(compress),
            });
            expect(ethers.AbiCoder.defaultAbiCoder().decode(['bytes'], decompressedCalldata)).to.deep.eq([calldata]);
        });

        it('should decompress random bytes', async function () {
            const { addr1, decompressor } = await loadFixture(initContractsAndLoadCalldatas);
            const calldata = '0xabaabbcc0102';
            const compress = '0x45abaabbcc0102' 
            const decompressedCalldata = await ethers.provider.call({
                to: decompressor,
                data: decompressor.interface.encodeFunctionData('decompressed') + trim0x(compress),
            });
            expect(ethers.AbiCoder.defaultAbiCoder().decode(['bytes'], decompressedCalldata)).to.deep.eq([calldata]);
        });

        it('should decompress calldatas with 1000 cases', async function () {
            if (hre.__SOLIDITY_COVERAGE_RUNNING) { this.skip(); }
            const { addr1, decompressor, calldatas, compressedDatas } = await loadFixture(initContractsAndLoadCalldatas);

            let counter = 0;
            for (const tx in calldatas) {
                const compressed = compressedDatas[tx];
                const decompressedCalldata = await ethers.provider.call({
                    to: decompressor,
                    data: decompressor.interface.encodeFunctionData('decompressed') + trim0x(compressed),
                });
                expect(ethers.AbiCoder.defaultAbiCoder().decode(['bytes'], decompressedCalldata)).to.deep.eq([calldatas[tx]]);
                if (counter++ === CALLDATAS_LIMIT) break;
            }
        }).timeout(1000000);
    });

});
