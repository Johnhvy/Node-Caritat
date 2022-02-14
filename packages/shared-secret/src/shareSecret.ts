type i32 = number;
type u8 = number;

const OFFSET = 3;

/*
The idea:

We want to create a cryptographic key that no single party has control over. For example, we might need M people (called "shareholders" here)") to have parts of the key, 
but we want to require only N (<=M) shareholders needed to be able to reconstruct the original key.

Each part of the key is associated some specific "part index", that is used to generate it, and to help with reconstruction.

To do that, the naive algorithm for the solution presented here consist on recursively splitting the key into a "tree" of sub-keys, with M branches at each depth level and N-1 depth levels.
For each depth level and each parent node, every user is missing a different branch of the tree. That way every key is missing M^(N-1) - (M-1)^(N-1) parts of the key

The size of the key is: chunkSize*M^(N-1) , with chunkSize being the size of data associated with each "leaf" of the tree (1 char in the example)

If only (N-1) shareholders agree to try to reconstruct the key, they will have to guess chunkSize*(N-1)! bits of information to brute-force the rest of the key


Example with M = 4 and n = 3 , Key = O123456789ABCDEF

  every individual "part" of the key is missing 4^2 - 3^2 = 7 characters

  key part 0: 5679ABDEF
           _______root_____________
          /     |         |        \ 
          X   / | | \   / | | \   / | | \  
            X  O O  O X  O O  O X  O O  O
               5 6  7    9 A  B    D E  F

  key part 1: O238ABCEF
           _______root____________
          /     |        |        \ 
      / | | \  X     / | | \   / | | \  
      O  X O  O      O  X O  O O  X O  O
      O    2  3      8    A  B C    E  F

  key part 2: O13457CDF 
           ___________root________
          /         |     |       \ 
      / | | \   / | | \   X      / | | \  
     O  O X  O O  O X  O        O  O X  O
    O  1    3  4  5    7       C  D    F 

  key part 3: O1245689A
           ___________root____________
          /         |         |       \ 
      / | | \   / | | \   / | | \     X
      O  O O  X O  O O  X O  O O  X
      O  1 2    4  5 6    8  9 A

To reconstruct the key, we can try to reconstruct the tree for the final key, and try to find the value associated with each leaf
 by reconstructing the trees that were used to make the key parts.

But this algorithm can be optimized by making a change of perspective:

In the previous example: 
  the "tree" of the key is 
         ________root_____________
        /        |         |        \ 
    / | | \   / | | \   / | | \   / | | \  
   O  1 2  3 4  5 6  7 8  9 A  B C  D E  F

  If we associate for each branch based on its position from left to right among its sibling, then concatenate all the parent numbers for each leaf,
   we get the following sequence of resulting strings:
   "00","01","02""03","10","11","12","13","20",[...],"33"

   these strings are corresponding the base-M representation of the index of each "chunk" of the tree within the parent tree.
    (this representation has N-1 "digits")
  
    For every "part" of index k, the missing chunks of the key are those containing k as a digit in this representation

This means that to have the same result, instead of using the tree representation, we can get the base-M representation
 of the indices of each chunk, and discard the chunks containing the "part index" as a digit in this representation.

But we can go further: 

for example :
  key part 1: O238ABCEF
          ______root_____
         /       |       \ 
      / | \    / | \    / | \  
     O  2  3  8  A  B  C  E  F

     Doing the same operation as before, but with the undesired branches removed, we get:
     "00","01","02","10","11","12","20","21","22"
     Which is the base-[M-1] representation of the index of each "chunk" of the tree within the child tree.

Starting from here, "Base-M index" will refer to the base-M representation of the index of a chunk within the original key,  
  and "Base-[M-1] index" will refer to the base-[M-1] representation of the index of the same chunk within some key part

For every chunk of the part, the base-[M-1] index can easily be created from the original Base-M index by doing the following:
    for every "digit",
     if the digit is greater than the part index
      decrease the digit by one
    thats it
  (note that if the chunk is indeed contained in the key part, no digit of the base-M index should be strictly equal to the key index)

And the inverse transformation is as easy:
    for every "digit",
     if the digit is greater or equal than the part index
      increase the digit by one
    thats it

This way, a more simple algorithm to get the value of any chunk in some part is:
  - convert the position of the chunk in the part into the base-[M-1] index
  - get the corresponding base-M index (using the key index and the other algorithm)
  - convert the base-M index into the position of the corresponding chunk in the key
  - the desired value is the content of this corresponding chunk

Similarly, to regenerate the key, we can try to get the corresponding position of any chunk of the key
 in the parts that should contain this chunk.

The "base-conversion -> index-correspondance -> inverse-base-conversion" pipeline 
 can be turned into a single loop for optimization, without ever needing to 
 explicitly generate the base representations. (but the idea remains the same)


Considering the fact that the keys can get really big really fast, i would advise to use a hash of this key as the actual encryption key.
*/

/**
 * Converts the position `compressedCoord` of some chunk in the key part `partIndex` into the
 * position of the corresponding chunk within the "raw" key
 * @param compressedCoord
 * @param partIndex
 * @param shareHolders
 * @param depth
 * @returns The position of the chunk within the raw key
 */
function getRawCoordinate(
  compressedCoord: i32,
  partIndex: u8,
  shareHolders: u8,
  depth: i32
): i32 {
  let compressedBase = shareHolders - 1;
  let number = compressedCoord;
  let rawCoord = 0;
  let a = 1;
  // In this loop, 3 things are happening at once:
  // The digits of `compressedCoord` in base (shareHolders - 1) are being extracted
  // The digits of `rawCoord` in base shareHolders are being generated from it
  // and rawCoord itself is being calculated using the value of these digits
  for (let i = depth; i > 0; i--) {
    let mod = (number % compressedBase) as u8;
    rawCoord += a * (mod >= partIndex ? mod + 1 : mod);
    number = (number / compressedBase) | 0;
    a *= shareHolders;
  }
  return rawCoord;
}

/**
 * Converts if possible the position `rawCoord` of some chunk in the raw key into the
 * position of the corresponding chunk within the key part `partIndex`
 * @param rawCoord
 * @param partIndex
 * @param shareHolders
 * @param depth
 * @returns The position within the key part `partIndex` if it exists, -1 if it doesn't
 */
function getCompressedCoordinate(
  rawCoord: i32,
  partIndex: u8,
  shareHolders: u8,
  depth: i32
): i32 {
  let number = rawCoord;
  let compressedCoord = 0;
  let a = 1;
  // In this loop, 4 things are happening at once:
  // The digits of `rawCoord` in base (shareHolders) are being extracted
  // We check if the corresponding compressedCoord actually exists
  // The digits of `compressedCoord` in base shareHolders are being generated from it
  // and compressedCoord itself is being calculated using the value of these digits
  for (let i = depth; i > 0; i--) {
    let mod = (number % shareHolders) as u8;
    if (mod === partIndex) return -1;
    compressedCoord += a * (mod > partIndex ? mod - 1 : mod);
    number = (number / shareHolders) | 0;
    a *= shareHolders - 1;
  }
  return compressedCoord;
}
/**
 * Generate the key part `partIndex` from the `rawKey`
 * @param rawKey
 * @param compressedKey An empty ArrayBuffer of the correct size (should be the size of the actual content of the key + 3 bytes for metadata). This will be filled with the key part as a side effect
 * @param shareHolders
 * @param neededParts
 * @param partIndex
 */
export function compressKey(
  rawKey: Uint8Array,
  compressedKey: Uint8Array,
  shareHolders: u8,
  neededParts: u8,
  partIndex: u8
): void {
  const compressedKeySize = compressedKey.byteLength - OFFSET;
  const compressedKeyView = new DataView(
    compressedKey.buffer,
    compressedKey.byteOffset + OFFSET,
    compressedKeySize
  );

  for (let i = 0; i < compressedKeySize; i++) {
    const rawCoord = getRawCoordinate(
      i,
      partIndex,
      shareHolders,
      neededParts - 1
    );
    compressedKeyView.setUint8(i, rawKey[rawCoord]);
  }

  const metadataView = new DataView(
    compressedKey.buffer,
    compressedKey.byteOffset,
    OFFSET
  );
  metadataView.setUint8(2, partIndex);
  metadataView.setUint8(1, shareHolders);
  metadataView.setUint8(0, neededParts);
}

/**
 * Generate the full key using the key parts
 * @param compressedKeys
 * @returns The full key as an ArrayBuffer
 */
export function reconstructKey(
  compressedKeys: Array<ArrayBuffer>
): ArrayBuffer {
  const dataViews = new Array<DataView>(compressedKeys.length);

  const indices = new Array<u8>(compressedKeys.length);

  // Extract metadata from key parts
  for (let i = 0; i < compressedKeys.length; i++) {
    dataViews[i] = new DataView(compressedKeys[i], 0, OFFSET);
  }
  let shareHolders: u8 = 0;
  let neededParts: u8 = 0;
  for (let i = 0; i < compressedKeys.length; i++) {
    const keyIndex = dataViews[i].getUint8(2);
    if (i === 0) {
      shareHolders = dataViews[0].getUint8(1);
      neededParts = dataViews[0].getUint8(0);
      if ((neededParts as i32) < compressedKeys.length)
        throw new Error("Not enough parts to reconstruct key.");
    } else if (
      dataViews[i].getUint16(0) !==
      (neededParts << 8) + shareHolders
    ) {
      throw new Error("Incompatible key parts.");
    } else if (indices.includes(keyIndex)) {
      console.log({ indices, keyIndex } as any);
      throw new Error("Duplicate key part.");
    }
    indices[i] = keyIndex;
  }

  for (let i = 0; i < compressedKeys.length; i++) {
    dataViews[i] = new DataView(compressedKeys[i], OFFSET);
  }

  const depth = neededParts - 1;

  const chunkSize =
    (compressedKeys[0].byteLength - OFFSET) / (shareHolders - 1) ** depth;

  const rawKeySize = shareHolders ** depth * chunkSize;
  const rawKey = new ArrayBuffer(rawKeySize);

  const rawKeyView = new DataView(rawKey);

  for (let rawCoord = 0; rawCoord < rawKeySize; rawCoord++) {
    let compressedCoord: i32;
    let part = -1;
    do {
      compressedCoord = getCompressedCoordinate(
        rawCoord,
        indices[++part],
        shareHolders,
        depth
      );
    } while (compressedCoord < 0);
    rawKeyView.setUint8(rawCoord, dataViews[part].getUint8(compressedCoord));
  }
  return rawKey;
}
