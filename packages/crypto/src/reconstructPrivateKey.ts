import { symmetricDecrypt } from "./rsa-aes-decrypt.js";
const shamir = { reconstruct: Function.prototype }; // TODO: import actual Shamir secret sharing implementation.

export async function reconstructPrivateKey(
  encryptedPrivateKey: BufferSource,
  shares: ArrayBuffer[],
  threshold?: number
) {
  if ((threshold ?? shares.length) === 1) {
    return symmetricDecrypt(shares[0], encryptedPrivateKey);
  } else {
    const secret = shamir.reconstruct(shares, threshold);
    return symmetricDecrypt(secret, encryptedPrivateKey);
  }
}
