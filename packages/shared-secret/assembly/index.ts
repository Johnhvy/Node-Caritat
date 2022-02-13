// The entry file of your WebAssembly module.
const OFFSET = 3;

function getRawCoordinate(
  compressedCoord: i32,
  keyIndex: u8,
  shareHolders: u8,
  depth: i32
): i32 {
  let compressedBase = shareHolders - 1;
  let number = compressedCoord;
  let rawCoord = 0;
  let a = 1;
  for (let i = depth; i > 0; i--) {
    let mod = (number % compressedBase) as u8;
    rawCoord += a * (mod >= keyIndex ? mod + 1 : mod);
    number /= compressedBase;
    a *= shareHolders;
  }
  return rawCoord;
}

function getCompressedCoordinate(
  rawCoord: i32,
  keyIndex: u8,
  shareHolders: u8,
  depth: i32
): i32 {
  let number = rawCoord;
  let compressedCoord = 0;
  let a = 1;
  for (let i = depth; i > 0; i--) {
    let mod = (number % shareHolders) as u8;
    if (mod === keyIndex) return -1;
    rawCoord += a * (mod > keyIndex ? mod - 1 : mod);
    number /= shareHolders;
    a *= shareHolders - 1;
  }
  return compressedCoord;
}

export const rawKey_ID = idof<Uint8Array>();
export const compressedKey_ID = idof<Uint8Array>();

export function compressKey(
  rawKey: Uint8Array,
  compressedKey: Uint8Array,
  shareHolders: u8,
  neededParts: u8,
  keyIndex: u8
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
      keyIndex,
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
  metadataView.setUint8(0, keyIndex);
  metadataView.setUint8(1, shareHolders);
  metadataView.setUint8(2, neededParts);
}

export function reconstructKey(
  rawKey: ArrayBuffer,
  compressedKeys: Array<ArrayBuffer>
): void {
  const dataViews = new Array<DataView>(compressedKeys.length);

  const indices = new Array<u8>(compressedKeys.length);

  // Extract metadata from key parts
  for (let i = 0; i < compressedKeys.length; i++) {
    dataViews[i] = new DataView(compressedKeys[i], 0, OFFSET);
  }
  let shareHolders: u8 = 0;
  let neededParts: u8 = 0;
  for (let i = 0; i < compressedKeys.length; i++) {
    const keyIndex = dataViews[i].getUint8(0);
    if (i === 0) {
      shareHolders = dataViews[0].getUint8(1);
      neededParts = dataViews[0].getUint8(2);
      if ((neededParts as i32) < compressedKeys.length)
        throw new Error("Not enough parts to reconstruct key.");
    } else if (
      dataViews[i].getUint8(1) !== shareHolders ||
      dataViews[i].getUint8(2) !== neededParts
    ) {
      throw new Error("Incompatible key parts.");
    } else if (indices.includes(keyIndex)) {
      throw new Error("Duplicate key part.");
    }
    indices[i] = keyIndex;
  }

  for (let i = 0; i < compressedKeys.length; i++) {
    dataViews[i] = new DataView(compressedKeys[i], OFFSET);
  }

  const rawKeyView = new DataView(rawKey);

  const rawKeySize = rawKey.byteLength;

  for (let rawCoord = 0; rawCoord < rawKeySize; rawCoord++) {
    let compressedCoord: i32;
    let part = -1;
    do {
      compressedCoord = getCompressedCoordinate(
        rawCoord,
        indices[++part],
        shareHolders,
        neededParts - 1
      );
    } while (compressedCoord < 0);
    rawKeyView.setUint8(rawCoord, dataViews[part].getUint8(compressedCoord));
  }
}
