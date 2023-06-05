export function getGPGSignGitFlag(gpgSign) {
  return gpgSign ? (gpgSign === true ? ["-S"] : ["-S", gpgSign]) : [];
}
