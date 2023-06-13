const webcrypto: typeof window.crypto =
  typeof crypto !== "undefined"
    ? crypto
    : await import("node:crypto")
        .then((module) => module.default.webcrypto as typeof window.crypto)
        .catch(() => ({} as typeof window.crypto));

export default webcrypto;
export const { subtle } = webcrypto;
