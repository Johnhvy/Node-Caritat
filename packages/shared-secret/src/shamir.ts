type u8 = number;

const BITS = 8;
const ORDER_OF_GALOIS_FIELD = 2 ** BITS;
const MAX_VALUE = ORDER_OF_GALOIS_FIELD - 1;
//https://www.partow.net/programming/polynomials/index.html#deg08
const DEGREE_8_PRIMITIVE_POLYNOMIALS = [
  0b11101, 0b101011, 0b1011111, 0b1100011, 0b1100101, 0b1101001, 0b11000011,
  0b11100111,
];
const PRIMITIVE = DEGREE_8_PRIMITIVE_POLYNOMIALS[0];

const logs = Array(MAX_VALUE);
const exps = Array(MAX_VALUE);

// Algorithm to generate lookup tables for corresponding exponential and logarithm in GF(2**8)
for (let i = 0, x = 1; i < MAX_VALUE; i++) {
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

function multiplyPolynomials(a: u8, b: u8) {
  // a*b = exp(log(a)+log(b))
  if (a * b === 0) return 0;
  return exps[(logs[a] + logs[b]) % MAX_VALUE];
}

function dividePolynomials(a: u8, b: u8) {
  // a/b = exp(log(a)-log(b))
  if (a === 0) return 0;
  if (b === 0) throw new Error("Div/0");
  return exps[(logs[a] + MAX_VALUE - logs[b]) % MAX_VALUE];
}

function addPolynomials(a: u8, b: u8) {
  // Addition in ℤ/2ℤ is a xor. Therefore, for polynomials on ℤ/2ℤ, it is the same as a bitwise xor
  return a ^ b;
}

function subtractPolynomials(a: u8, b: u8) {
  // The inverse of xor is xor itself
  return a ^ b;
}

export function* generatePoints(origin: u8, shareHolders: u8, neededParts: u8) {
  // TODO: ensure neededParts<=255 (if necessary?)
  const coefficients = crypto.getRandomValues(new Uint8Array(neededParts - 1));

  for (let x = 1; x <= shareHolders; x++) {
    // Horner method
    let y = coefficients[0];
    for (let t = 1; t < neededParts - 1; t++) {
      y = addPolynomials(multiplyPolynomials(x, y), coefficients[t]);
    }
    yield { x, y: addPolynomials(multiplyPolynomials(x, y), origin) };
  }
}

export function reconstructByte(
  points: Array<{ x: u8; y: u8 }>,
  neededParts: u8 = null
): u8 {
  const shareHolders = points.length;
  neededParts = neededParts ?? shareHolders;
  if (shareHolders < neededParts)
    throw new Error("Not enough points to reconstruct byte");

  let Σ = 0x00;
  for (let j = 0; j < neededParts; j++) {
    const pj = points[j];
    let Π = 0x01;
    //evaluate Lagrange polynomial for point j at x=0
    for (let i = 0; i < neededParts; i++) {
      const pi = points[i];
      if (j === i) continue;
      Π = multiplyPolynomials(
        Π,
        dividePolynomials(pi.x, subtractPolynomials(pj.x, pi.x))
      );
      //Π *= (x0-xi)/(xj-xi)
    }
    //scale and add Lagrange polynomials together to get the value of the interpolating polynomial at x=0
    Σ = addPolynomials(Σ, multiplyPolynomials(pj.y, Π));
    //Σ += yj*Π
  }
  return Σ;
}

/**
 * Generate the key part `partIndex` from the `rawKey`
 * @param rawKey the array of bytes that needs to be split and shared
 * @param shareHolders the amount of people that will own some part of the key
 * @param neededParts  the amount of parts needed to reconstruct the whole key
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
    part[0] = i + 1;
    for (let j = 0; j < points.length; j++) {
      part[j + 1] = points[j][i].y;
    }
    return part;
  });
}

/**
 * Generate the full key using the key parts
 * @param parts An array of the Uint8Array containing key parts from the shareholders
 * @yields All the bytes of the original key
 */
export function* reconstructKey(parts: Uint8Array[], neededParts: u8 = null) {
  const shareHolders = parts.length;
  neededParts = neededParts ?? shareHolders;
  if (shareHolders < neededParts)
    throw new Error("Not enough parts to reconstruct key");
  const bytes = parts[0].length - 1;
  for (let i = 0; i < bytes; i++) {
    let points = Array<{ x: u8; y: u8 }>(neededParts);
    for (let j = 0; j < neededParts; j++) {
      points[j] = { x: parts[j][0], y: parts[j][i + 1] };
    }
    yield reconstructByte(points, neededParts);
  }
}
