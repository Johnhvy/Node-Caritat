const crypto = require("crypto");
const wasmModule = require("./assembly/index.js");
module.exports = {
  generateKeyParts,
  reconstructKey,
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

  console.log(secret.toString("hex"));

  // const keyBuffer_ptr = wasmModule.exports.__newArray(
  //   wasmModule.exports.rawKey_ID,
  //   secret
  // );

  const compressedLength = (shareHolders - 1) ** maxDepth * chunkSize + 3;
  // const partBuffer_ptr = wasmModule.exports.__newArray(
  //   wasmModule.exports.compressedKey_ID,
  //   compressedLength
  // );
  const partBuffer = new Uint8Array(compressedLength);

  for (let i = 0; i < neededParts; i++) {
    wasmModule.compressKey(secret, partBuffer, shareHolders, neededParts, i);
    yield partBuffer.buffer.slice();
  }
}
function reconstructKey(...parts) {
  return wasmModule.reconstructKey(parts);
}
