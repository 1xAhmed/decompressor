# Decompressor Contract

## Overview
A Solidity smart contract that decompresses compressed ETH-ABI-encoded data, allowing submission of large data chunks within Ethereum's transaction size limits.

## Tests environment

```bash
npm install
npx hardhat test
```

There is compressed & uncompressed data files in `./test` dir. The test utilises first 1000 cases and decompresses the bytes and compares it with the uncompressed data.

### Decompress algo
The decompression algorithm implemented in the DecompressorContract reconstructs the original Ethereum ABI-encoded data from its compressed form. It processes the compressed data sequentially, performing specific actions based on the evaluation of each byte. The algorithm is optimized for gas efficiency and is capable of handling large datasets.


 #### Initialization

`Input Handling`: The function accepts compressedData as a bytes calldata parameter, representing the compressed form of the original ABI-encoded data.
`Output Buffer Allocation`: An output buffer output is initialized with a size equivalent to the length of the input data to accommodate the decompressed data.

 #### Pointer Setup

`Input Pointer (inputPointer)`: Points to the current position within the compressedData. It starts at the beginning of the compressed data.
`Output Pointer (outputPointer)`: Points to the current position within the output buffer where decompressed data will be written. It begins immediately after the 32-byte length slot of the output buffer.
`End Pointer (endPointer)`: Marks the end of the compressedData, indicating where the processing loop should terminate.

 #### Processing Loop

The algorithm enters a loop that continues until the inputPointer reaches the endPointer.

 #### Marker Byte Extraction:

At each iteration, a single byte (marker) is read from the compressedData using the calldataload operation.
The inputPointer is incremented to move to the next byte for subsequent operations.
 #### Determination:

The algorithm evaluates specific bits within the marker byte to determine the required action:
`Insertion`: Indicates that a certain number of zero bytes should be inserted into the output buffer.
`Copying`: Indicates that a specified number of bytes should be copied directly from the compressed input to the decompressed output.

 #### Zero Byte Insertion

`Size Calculation`: Determines the number of zero bytes to insert based on the evaluated bits of the marker.
`Chunked Writing`: The calculated number of zero bytes is divided into 32-byte chunks to optimize memory operations.
For each 32-byte chunk, a block of zero bytes is written to the output buffer using the mstore operation.
`Remaining Zeros`:
Any leftover zero bytes that do not fit into a 32-byte chunk are written individually to ensure precise memory alignment.

 #### Direct Data Copying

`Size Calculation`: Determines the number of bytes to copy from the compressed input to the decompressed output based on the evaluated bits of the marker.
`Data Copy Operation`: Utilizes the calldatacopy instruction to transfer the specified number of bytes from the compressedData to the output buffer.
`Pointer Advancement`: Both inputPointer and outputPointer are incremented by the number of bytes copied to move past the processed data and prepare for the next iteration.

 #### Returned Output

`Output Length Calculation`: After processing all input data, the total length of the decompressed data is computed by subtracting the starting address of the output buffer from the current outputPointer position.
`Memory Update`: The mstore operation updates the first 32 bytes of the output buffer to reflect the actual length of the decompressed data.
The free memory pointer (0x40) is adjusted to ensure proper memory management for subsequent operations.
`Return Statement`: The fully decompressed output buffer, now accurately representing the original ABI-encoded data, is returned from the function.

#### Assembly Details:

`Memory Allocation`: The output buffer is pre-allocated with a length equal to the compressedData length. This allocation makes sure that the sufficient space for the decompressed data, with adjustments made based on the actual data processed.

`Marker Byte Interpretation`: Each marker byte indicates an instruction for the decompression process, dictating whether to insert zero bytes or copy a segment of data.
 
The algorithm incorporates a revert mechanism to terminate transactions if an invalid marker byte is encountered, safeguarding against data corruption or unintended behavior.

`Compressed Data Structure`: The compressed data consists of a sequence of marker bytes, each followed by data bytes if required. Marker bytes determine whether the subsequent data involves zero byte insertion or direct data copying.

 #### Decompression Process:

The algorithm reads each marker byte sequentially.
Based on the marker, it either inserts a calculated number of zero bytes or copies a specified number of bytes from the compressed data to the output buffer.
This process continues until all bytes in the compressed data have been processed.

#### Final Output:
The result is a decompressed byte array that represents the original Ethereum ABI-encoded data, reconstructed from its compressed form.
