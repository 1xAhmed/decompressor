// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import { DecompressorContract } from "../Decompress.sol";

contract DecompressorContractMock is DecompressorContract {
    
    function decompressed() public payable returns(bytes memory raw) {
        return decompress(msg.data[4:]);
    }
}
