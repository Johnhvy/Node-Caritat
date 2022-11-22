type i32 = number;
type u8 = number;

const OFFSET = 3;

const BITS = 8;
const ORDER_OF_GALOIS_FIELD = 2 ** BITS;
const PRIMITIVE = 0b11101;

const logs = Array(ORDER_OF_GALOIS_FIELD);
const exps = Array(ORDER_OF_GALOIS_FIELD);

for (let i = 0, x = 1; i < ORDER_OF_GALOIS_FIELD - 1; i++) {
  exps[i] = x;
  logs[x] = i;
  x *= 2; // P(X):=P(X)*X
  if (x >= ORDER_OF_GALOIS_FIELD) {
    // if deg(P)>=BITS
    x ^= PRIMITIVE;
    x %= ORDER_OF_GALOIS_FIELD;
    // P(X) = P(X) + PRIMITIVE(X) mod X^BITS
  }
}
exps[ORDER_OF_GALOIS_FIELD] = 1; //out of the loop to avoid rewriting log(1);

function multiplyPolynomials(a: u8, b: u8) {
  if (a * b === 0) return 0;
  return exps[(logs[a] + logs[b]) % ORDER_OF_GALOIS_FIELD];
}

function addPolynomials(a: u8, b: u8) {
  return a ^ b;
}

function* generatePoints(origin: u8, shareHolders: u8, neededParts: u8) {
  // TODO: ensure needed parts<=255 (if neccecary?)
  const coefficients = crypto.getRandomValues(new Uint8Array(neededParts - 1));

  for (let x = 1; x <= shareHolders; x++) {
    // Horner method
    let y = coefficients[0];
    for (let t = 1; t < neededParts - 1; t++) {
      y = addPolynomials(multiplyPolynomials(x, y), coefficients[t]);
    }
    yield { x, y: addPolynomials(y, origin) };
  }
}

/**
 * Generate the key part `partIndex` from the `rawKey`
 * @param rawKey
 * @param shareHolders
 * @param neededParts
 */
export function splitKey(
  rawKey: ArrayBuffer,
  shareHolders: u8,
  neededParts: u8
): Uint8Array[] {
 // TODO: check if shareholders>=neededParts
  const rawDataView = new DataView(rawKey);

  const points = Array.from({ length: rawKey.byteLength }, (_, i) =>
    // Always use GF(2^8), so each chunk needs to be 8 bit long
    Array.from(
      generatePoints(rawDataView.getUint8(i), shareHolders, neededParts)
    )
  );
  return Array.from({ length: shareHolders }, (_, i) => {
    const part = new Uint8Array(1 + points.length);
    part[0] = i+1;
    for (let j = 0; j < points.length; j++) {
      part[j + 1] = points[j][i].y;
    }
    return part;
  });
}

/**
 * Generate the full key using the key parts
 * @param compressedKeys
 * @returns The full key as an ArrayBuffer
 */
export function reconstructKey(
  compressedKeys: Array<ArrayBuffer>
) {
 }