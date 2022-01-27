import { webcrypto } from "crypto";

export default webcrypto as any as typeof window.crypto;
export const { subtle, getRandomValues } =
  webcrypto as any as typeof window.crypto;
