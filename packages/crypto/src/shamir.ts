/**
 * u8 represents an element in GF(2^8), which is a representation of a 7-degree polynomial.
 * Examples:
 * - 0b10101010 represents X^7+X^5+X^3+X, in which X can be either 0 or 1.
 * - 0b10011001 represents X^7+X^4+X^3+1, in which X can be either 0 or 1.
 *
 * u8 coincides with a byte, which is conveninent for implementation puproses.
 */
type u8 = number;

const BITS = 8;
const ORDER_OF_GALOIS_FIELD = 2 ** BITS;
const MAX_VALUE = ORDER_OF_GALOIS_FIELD - 1;
// https://www.partow.net/programming/polynomials/index.html#deg08
const DEGREE_8_PRIMITIVE_POLYNOMIALS = [
  0b11101, 0b101011, 0b1011111, 0b1100011, 0b1100101, 0b1101001, 0b11000011,
  0b11100111,
];
const PRIMITIVE = DEGREE_8_PRIMITIVE_POLYNOMIALS[0];

const logs = Array(MAX_VALUE);
const exps = Array(ORDER_OF_GALOIS_FIELD);

// Algorithm to generate lookup tables for corresponding exponential and logarithm in GF(2^8)
for (let i = 0, x = 1; i < MAX_VALUE; i++) {
  exps[i] = x;
  logs[x] = i;
  x *= 2; // P(X) = P(X)*X
  if (x >= ORDER_OF_GALOIS_FIELD) {
    // if deg(P) >= BITS
    x ^= PRIMITIVE;
    x %= ORDER_OF_GALOIS_FIELD;
    // P(X) = P(X) + PRIMITIVE(X) mod X^BITS
  }
}

/**
 * Multiply two polynomials in GF(2^8).
 * @see https://en.wikipedia.org/wiki/Finite_field_arithmetic#Generator_based_tables
 */
function multiplyPolynomials(a: u8, b: u8): u8 {
  if (a === 0 || b === 0) return 0;
  // a*b = exp(log(a)+log(b))
  return exps[(logs[a] + logs[b]) % MAX_VALUE];
}

function dividePolynomials(a: u8, b: u8): u8 {
  if (b === 0) throw new RangeError("Div/0");
  if (a === 0) return 0;
  // a/b = exp(log(a)-log(b))
  return exps[(logs[a] + MAX_VALUE - logs[b]) % MAX_VALUE];
}

/**
 * Addition in ℤ/2ℤ is a xor. Therefore, for polynomials on ℤ/2ℤ, it is the same as a
 * bitwise xor.
 * @see https://en.wikipedia.org/wiki/Finite_field_arithmetic#Addition_and_subtraction
 */
function addPolynomials(a: u8, b: u8): u8 {
  return a ^ b;
}

/**
 * The inverse of xor is xor.
 */
const subtractPolynomials = addPolynomials;

/**
 * Hides the secret behind one point per shareholder.
 * @param secret A single byte of the secret. If the secret is larger than a
 *               byte, call this method once per byte.
 * @param shareHolders Number of points to generate.
 * @param neededParts The minimal number of points that should be necessary to
 *                    reconstruct the secret.
 */
export function* generatePoints(secret: u8, shareHolders: u8, neededParts: u8) {
  if (shareHolders > MAX_VALUE)
    throw new RangeError(
      `Expected ${shareHolders} <= ${MAX_VALUE}. Cannot have more than ` +
        `shareholders the size of the Gallois field`
    );
  if (shareHolders < neededParts)
    throw new RangeError(
      `Expected ${shareHolders} < ${neededParts}. Cannot have more less shareholders than needed parts`
    );
  // Generate neededParts-1 random polynomial coefficients in GF(2^8)
  const coefficients = crypto.getRandomValues(new Uint8Array(neededParts - 1));

  for (let x = 1; x <= shareHolders; x++) {
    // Horner method for fast polynomial evaluation: ax²+bx+c = ((0*x+a)x+b)x+c
    let y = coefficients[0];
    for (let t = 1; t < neededParts - 1; t++) {
      y = addPolynomials(multiplyPolynomials(x, y), coefficients[t]);
    }
    // We set the secret as the constant term.
    yield { x, y: addPolynomials(multiplyPolynomials(x, y), secret) };
  }
}

/**
 * Generate a byte from points using Lagrange interpolation at the origin
 * @param points Points that were given to shareholders.
 * @param neededParts If known, the amount of points necessary to reconstruct the secret.
 * @returns The secret byte, in clear.
 */
export function reconstructByte(
  points: { x: u8; y: u8 }[],
  neededParts: u8 = points.length
): u8 {
  let Σ = 0;
  for (let j = 0; j < neededParts; j++) {
    const { x: xj, y: yj } = points[j];
    let Π = 1;
    // Evaluate Lagrange polynomial for point j at x0=0.
    // It is the only polynomial on GF(2^8) whose value is 1 for x = xj,
    // and 0 for all the other points x values
    for (let i = 0; i < neededParts; i++) {
      if (j === i) continue;
      const { x } = points[i];
      Π = multiplyPolynomials(
        Π,
        dividePolynomials(x, subtractPolynomials(xj, x))
      );
      // Π *= (x0-x)/(xj-x)
      // d(X) = (X-x)/(xj-x) is the only line passing through (xj,1) and (x,0)
    }
    // Scale and add Lagrange polynomials together to get the value of the
    // interpolating polynomial at x0=0.
    Σ = addPolynomials(Σ, multiplyPolynomials(yj, Π));
    // Σ += yj*Π
  }
  return Σ;
}

/**
 * Generates one key-part per shareholder, hiding the secret. The secret cannot
 * be guessed from shareholders, unless they can provide at least `neededParts`
 * key-parts.
 * @param data The secret to hide.
 * @param shareHolders Number of key-parts to generate.
 * @param neededParts The minimal number of key-parts that should be necessary to
 *                    reconstruct the secret.
 */
export function split(
  data: BufferSource,
  shareHolders: u8,
  neededParts: u8
): Uint8Array[] {
  const isView = ArrayBuffer.isView(data);
  const length = data.byteLength;
  const rawDataView = new DataView(
    isView ? data.buffer : data,
    isView ? data.byteOffset : 0,
    length
  );

  const points = Array.from({ length }, (_, i) =>
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
 * Generates the full key using the key parts.
 * @param parts Key parts from the shareholders.
 * @param neededParts If known, the amount of points necessary to reconstruct the secret.
 * @returns The original secret.
 */
export function reconstruct(
  parts: BufferSource[],
  neededParts: u8 = parts.length
): Uint8Array {
  if (parts.length < neededParts)
    throw new Error("Not enough parts to reconstruct key");
  const bytes = parts[0].byteLength - 1;
  const result = new Uint8Array(bytes);
  const dataViews = parts.map((part) =>
    ArrayBuffer.isView(part)
      ? new DataView(part.buffer, part.byteOffset, bytes + 1)
      : new DataView(part)
  );
  for (let i = 0; i < bytes; i++) {
    result[i] = reconstructByte(
      Array.from({ length: neededParts }, (_, j) => {
        return { x: dataViews[j].getUint8(0), y: dataViews[j].getUint8(i + 1) };
      })
    );
  }

  return result;
}
