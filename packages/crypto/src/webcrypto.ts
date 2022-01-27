const webcrypto: typeof window.crypto =
  typeof crypto !== "undefined"
    ? crypto
    : await import("node:crypto")
        .then((module) => module.default.webcrypto as any)
        .catch(() => ({} as any));

export default webcrypto;
export const { subtle } = webcrypto;
