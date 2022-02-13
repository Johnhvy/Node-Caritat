const fs = require("fs");
const crypto = require("crypto");
const loader = require("@assemblyscript/loader");
const imports = {
  /* imports go here */
};
const wasmModule = loader.instantiateSync(
  fs.readFileSync(__dirname + "/build/untouched.wasm"),
  imports
);
module.exports = {
  generateKeyParts,
};

const fact = (n) => (n ? fact(n - 1) * n : 1);

function* generateKeyParts(shareHolders, neededParts, minimalEntropy) {
  const maxDepth = neededParts - 1;

  const fmd = fact(maxDepth);

  const chunkSize = Math.ceil(minimalEntropy / fmd);
  const chunkCount = shareHolders ** maxDepth;

  console.log("chunkSize: ", chunkSize);
  console.log(
    "Minimal entropy: ",
    chunkSize * fmd,
    "bytes\t(Targeted: ",
    minimalEntropy,
    "bytes)"
  );
  console.log("Chunk count: ", chunkCount);

  const secret = crypto.randomBytes(chunkCount * chunkSize);

  console.log(secret.buffer);

  const keyBuffer_ptr = wasmModule.exports.__newArray(
    wasmModule.exports.rawKey_ID,
    secret
  );

  const compressedLength = (shareHolders - 1) ** maxDepth * chunkSize + 3;
  const partBuffer_ptr = wasmModule.exports.__newArray(
    wasmModule.exports.compressedKey_ID,
    compressedLength
  );

  for (let i = 0; i < neededParts; i++) {
    wasmModule.exports.compressKey(
      keyBuffer_ptr,
      partBuffer_ptr,
      shareHolders,
      neededParts,
      i
    );
    yield wasmModule.exports.__getArrayBuffer(partBuffer_ptr);
  }
}
