export default {
  repo: {
    alias: "r",
    describe: "URL of the repository where the vote files are stored",
    demandOption: true,
    string: true as const,
  },
  branch: {
    alias: "b",
    describe: "git branch name",
    default: "main" as const,
    string: true as const,
  },
  path: {
    alias: "p",
    describe: "Relative subpath in the git repository to the vote files",
    default: "." as const,
    string: true as const,
  },
  "git-binary": {
    describe: "Path to the git binary (when not provided, looks in the $PATH)",
    normalize: true,
    string: true as const,
  },
  "do-not-clean": {
    describe:
      "Do not clean temporary file and the end of the process and prints the path of the local git clone to stdout.",
    boolean: true as const,
    default: false as const,
  },
};
