import { symmetricDecrypt } from "./rsa-aes-decrypt.js";
import * as shamir from "./shamir.js";

export async function reconstructPrivateKey(
  encryptedPrivateKey: BufferSource,
  shares: ArrayBuffer[],
  threshold?: number
) {
  if ((threshold ?? shares.length) === 1) {
    return symmetricDecrypt(encryptedPrivateKey, shares[0]);
  } else {
    const secret = shamir.reconstruct(shares, threshold);
    return symmetricDecrypt(encryptedPrivateKey, secret);
  }
}
