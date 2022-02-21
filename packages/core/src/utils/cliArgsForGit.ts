export default {
  repo: {
    alias: "r",
    describe: "URL of the repository where the vote files are stored",
    demandOption: true,
    string: true,
  },
  branch: {
    alias: "b",
    describe: "git branch name",
    default: "main",
    string: true,
  },
  path: {
    alias: "p",
    describe: "Relative subpath in the git repository to the vote files",
    default: ".",
    string: true,
  },
  "git-binary": {
    describe: "Path to the git binary (when not provided, looks in the $PATH)",
    normalize: true,
    string: true,
  },
  "do-not-clean": {
    describe:
      "Do not clean temporary file and the end of the process and prints the path of the local git clone to stdout.",
    type: "boolean",
    default: false,
  },
};
