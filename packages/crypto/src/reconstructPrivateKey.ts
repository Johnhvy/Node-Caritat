import { symmetricDecrypt } from "./rsa-aes-decrypt.js";
import * as shamir from "./shamir.js";

export default async function reconstructPrivateKey(
  encryptedPrivateKey: BufferSource,
  shares: BufferSource[],
  threshold?: number
) {
  if (!shares?.length) throw new Error("No shares provided");
  if ((threshold ?? shares.length) === 1) {
    return symmetricDecrypt(encryptedPrivateKey, shares[0]);
  } else {
    const secret = shamir.reconstruct(shares, threshold);
    return symmetricDecrypt(encryptedPrivateKey, secret);
  }
}
