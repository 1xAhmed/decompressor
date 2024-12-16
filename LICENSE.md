MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.



now, explain each word to me, what it does, what it means, its purpose etc

we have to remove the dict and make it a function that accepts compressed blob of bytes and returns uncompressed ETH-ABI-encoded version of the original message without storing it, only processing


we have to remove the dict and make it a function that accepts compressed blob of bytes and returns uncompressed ETH-ABI-encoded version of the original message without storing it, only processing

no address, no delegatecall no other bullshit, just pure decompression function

don't make up some shit, just simplify the logic.

then why the fuck did you make up some shit? does it means that the other assembly logic is flawed as well? and actually doesn't work?

All i wanted to do is simply the already written logic of decompression, nothing else

verify again and make sure that everything is up to the mark


this is my algorithm to compress and decompress. it takes around 66454 gas over 25 calls.

I have found another implementation of compression and decompression, it starts with K, kompression.

can we take some inspiration from this alternative implementation of compression and decompression and optimise our decompress function to save gas cost and make it efficient and also while making sure it is correct


go over kompression algo and see what we can do to optimise our _onlyDecompress function and then give the efficient version of our _onlyDompress.

also make sure to keep in mind all the EVM assembly and opcodes for the optimisation as you're the expert