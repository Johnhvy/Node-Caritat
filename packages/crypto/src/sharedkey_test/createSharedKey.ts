import crypto from "../webcrypto.js";

/**
 * Recursively removes parts of the secret so we need `maxDepth + 1` parts with different `currentShareHolder` to completely recreate the original secret.
 * @param buffer the buffer initially containing the secret;
 * @param currentShareHolder the index of the shareholder that will end up with this redacted key
 * @param shareHolders the total count of shareholders that will get a key
 * @param maxDepth recursion depth. This should be the amount of shareholders who are needed to recreate the key minus one
 * @param keyLength length of the current part of the key, used to optimise recursion. Defaults to the length of the buffer containing the key.
 * @param offset offset to the start of current sub-key in the buffer -- Should be called with its default value of 0
 * @param depth current recursion depth -- Should be called with its default value of 1
 * @returns nothing, but `buffer` gets the desired value as side-effect
 */
function redactKeyPart(
  buffer: Uint8Array,
  currentShareHolder: number,
  shareHolders: number,
  maxDepth: number,
  keyLength: number = buffer.length,
  offset: number = 0,
  depth: number = 1
): void {
  if (depth > maxDepth) return;
  const subKeyLength = keyLength / shareHolders;
  for (let subKey = 0; subKey < shareHolders; subKey++) {
    if (subKey == currentShareHolder) {
      buffer.fill(
        0,
        offset + subKeyLength * subKey,
        offset + subKeyLength * (subKey + 1)
      );
    } else {
      redactKeyPart(
        buffer,
        currentShareHolder,
        shareHolders,
        subKeyLength,
        maxDepth,
        offset + subKey * subKeyLength,
        depth + 1
      );
    }
  }
}

/**
 * Tries to regenerate the secret using key parts.
 * @param parts the parts of the key, with their respective indexes.
 * @returns the regenerated keys. If not enough keys are fed, some part of the key will be stay replaced with zeros.
 */
function regenerateSecret(parts: KeyPart[]): Uint8Array {
  const buffer: Uint8Array = new Uint8Array(parts[0].buffer);
  return buffer.map((value, index) => {
    let i = 0;
    while (value == 0) {
      i++;
      if (i >= parts.length) break;
      value = parts[i].buffer[index];
    }
    return value;
  });
}

interface KeyPart {
  index: number;
  buffer: Uint8Array;
}

const shareHolders = 5;
const neededParts = 4;
const minimalEntropy = 32;

const maxDepth = neededParts - 1;

const chunkSize = Math.ceil(minimalEntropy / maxDepth);

const chunkCount = shareHolders ** maxDepth;

const secret = new Uint8Array(chunkSize * chunkCount);

crypto.getRandomValues(secret);

const buffer: Uint8Array = new Uint8Array(secret);

let usedParts: KeyPart[] = [];

for (let i = 0; i < shareHolders; i++) {
  redactKeyPart(buffer, i, shareHolders, maxDepth);
  console.log(Buffer.from(buffer).toString("hex").replaceAll("00", "__"));
  if (i < neededParts)
    usedParts = [...usedParts, { index: i, buffer: new Uint8Array(buffer) }];
  console.log("\n");
  buffer.set(secret);
}

console.log(usedParts);

const regeneratedSecret = regenerateSecret(usedParts);
console.log(Buffer.from(secret).toString("hex"));
console.log("\n");
console.log(Buffer.from(regeneratedSecret).toString("hex"));
