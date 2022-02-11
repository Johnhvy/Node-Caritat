import crypto from "../webcrypto.js";

/*
    The idea:

We want to create a cryptographic key that no single party has control over. For example, we might need M people (called "shareholders" here)") to have parts of the key, 
but we want to require only N (<=M) shareholders needed to be able to reconstruct the original key.

To do that, the solution presented here consist on recursively splitting the key into a "tree" of sub-keys, with M branches at each depth level and N-1 depth levels.
For each depth level and each parent node, every user is missing a different branch of the tree. That way every key is missing M^(N-1) - (M-1)^(N-1) parts of the key

If only (N-1) shareholders agree to try to reconstruct the key, they will have to guess chunkSize*(N-1)! bits of information to brute-force the rest of the key

15, 42, 156, 720, 3960, 30240

Example with M = 4 and n = 3 , Key = O123456789ABCDEF

every part is missing 4^2 - 3^2 = 7 characters (replaced with zeros)

key part 0: 0000056709AB0DEF
                root
         /     |         |        \ 
        X   / | | \   / | | \   / | | \  
           X  O O  O X  O O  O X  O O  O
              5 6  7    9 A  B    D E  F

key part 1: O023000080ABC0EF
                root
        /     |        |        \ 
    / | | \  X     / | | \   / | | \  
    O  X O  O      O  X O  O O  X O  O
    O    2  3      8    A  B C    E  F

key part 2: O10345070000CD0F 
                    root
        /         |     |       \ 
    / | | \   / | | \  X      / | | \  
    O  O X  O O  O X  O       O  O X  O
    O  1    3 4  5    7       C  D    F 

key part 3: O120456089A00000
                    root
        /         |         |       \ 
    / | | \   / | | \   / | | \     X
    O  O O  X O  O O  X O  O O  X
    O  1 2    4  5 6    8  9 A

The size of the key is: chunkSize * M^(N-1) , with chunkSize being the size of data associated with each "leaf" of the tree (1 char in the example)

Considering the fact that the keys can get really big really fast, i would advise to use a hash of this key as the actual encryption key.
*/

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
  // console.log(
  //   currentShareHolder,
  //   shareHolders,
  //   maxDepth,
  //   keyLength,
  //   offset,
  //   depth
  // );
  for (let subKey = 0; subKey < shareHolders; subKey++) {
    if (subKey == currentShareHolder) {
      // console.log(Buffer.from(buffer).toString("hex").replaceAll("00", "__"));
      // console.log(subKey, keyLength * subKey);
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
        maxDepth,
        subKeyLength,
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
const minimalEntropy = 10;

const maxDepth = neededParts - 1;

const fact = (n: number) => (n ? fact(n - 1) * n : 1);
const fmd = fact(maxDepth);

const chunkSize = Math.ceil(minimalEntropy / fmd);

console.log("chunkSize: ", chunkSize);
console.log(
  "Minimal entropy: ",
  chunkSize * fmd,
  "bytes\t(Targeted: ",
  minimalEntropy,
  "bytes)"
);

const chunkCount = shareHolders ** maxDepth;

const secret = new Uint8Array(chunkSize * chunkCount);

// crypto.getRandomValues(secret);
secret.fill(0xff);
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
111111111111111111111111;
