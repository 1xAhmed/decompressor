// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @title DecompressorContract
 * @dev A contract that implements a decompression algorithm.
 * @notice This extension could result in a much higher gas consumption than expected and could potentially lead to significant memory expansion costs. Be sure to properly estimate these aspects to avoid unforeseen expenses.
 */
contract DecompressorContract {

    /**
     * @dev Decompresses the compressed data and returns the uncompressed ETH-ABI-encoded data.
     * This implementation is inspired by the 1inch calldata-compressor library.
     * @param compressedData The compressed bytes data.
     * @return decompressedData The decompressed bytes data.
     */
    function decompress(bytes calldata compressedData) public pure returns (bytes memory) {
        uint256 inputLength = compressedData.length;
        bytes memory output = new bytes(inputLength); // Adjusted initial size

        assembly ("memory-safe") {
            let inputPointer := compressedData.offset
            let outputPointer := add(output, 32) // Skip length slot
            let endPointer := add(inputPointer, inputLength)

            // Prepare constants
            let freeMemPointer := mload(0x40)

            for { } lt(inputPointer, endPointer) { } {
                let marker := byte(0, calldataload(inputPointer))
                inputPointer := add(inputPointer, 1)

                switch shr(6, marker) // Check the two highest bits
                case 0x00 {
                    // Case 0b00: Insert N zero bytes, where N is the lower 6 bits + 1
                    let size := add(and(marker, 0x3F), 1)
                    let zeroWords := div(size, 32)
                    let zeroRemainder := mod(size, 32)

                    // Write zeros in chunks of 32 bytes
                    for { let i := 0 } lt(i, zeroWords) { i := add(i, 1) } {
                        mstore(outputPointer, 0)
                        outputPointer := add(outputPointer, 32)
                    }

                    // Write remaining zeros
                    if zeroRemainder {
                        mstore(outputPointer, 0)
                        outputPointer := add(outputPointer, zeroRemainder)
                    }
                }
                case 0x01 {
                    // Case 0b01: Copy N bytes directly from the input
                    let size := add(and(marker, 0x3F), 1)
                    calldatacopy(outputPointer, inputPointer, size)
                    inputPointer := add(inputPointer, size)
                    outputPointer := add(outputPointer, size)
                }
                default {
                    // Invalid marker; revert
                    revert(0, 0)
                }
            }

            // Calculate final output length
            let finalLength := sub(outputPointer, add(output, 32))
            mstore(output, finalLength)

            // Update free memory pointer
            mstore(0x40, and(add(outputPointer, 31), not(31)))
        }

        return output;
    }

}

