# Caritat

The name comes from Marie Jean Antoine Nicolas de Caritat, Marquis of Condorcet,
French philosopher and mathematician, notably known for championing an election
method that now named after him.

The goal of this project is to allow organisations of people working remotely to
cast votes is a secure and transparent way, using a git repository to collect and
authenticate votes.

## Usage

### Participate to a vote using Caritat

#### Node.js CLI

Requires [Node.js](https://nodejs.org) 16+ and [git](https://git-scm.com).

If the vote is setup on a GitHub pull request and you have
[`gh`](https://cli.github.com) locally installed and logged in to your GitHub
account:

```sh
npx --package=@node-core/caritat-cli voteOnGitHub <pr-url>
```

Otherwise, you can specify the details manually:

```sh
npx --package=@node-core/caritat-cli voteUsingGit \
  --repo=<repo-url> --branch=<branch-name> \
  --path=<subfolder-where-the-vote-data-is-stored> \
  --handle=<your-github-handle>
```

#### Shell scripts

You can use one of the shell script from the `sh/` folder. Requires `openssl`
(LibreSSL CLI is not compatible) and `git` to be available on the local machine.

On a Unix-like OS:

```sh
sh/voteUsingGit.sh <your-github-handle> <repo-url> <branch-name> <subfolder-where-the-vote-data-is-stored>
```

On Windows:

```sh
sh/voteUsingGit.ps1 <your-github-handle> <repo-url> <branch-name> <subfolder-where-the-vote-data-is-stored>
```

#### Web UI

Only works for vote that are hosted on a GitHub pull request.

Visit <https://stduhpf.github.io/caritat/>, paste the URL of the pull request,
and create the JSON file containing your encrypted ballot using GitHub web UI.

### Setup a vote using Caritat

#### Node.js script

```sh
npx --package=@node-core/caritat-cli generateNewVoteFolder \
 --repo "<repo-url>" --branch "<new-vote-branch-name>" \
 --directory "<relative-path-to-new-vote-folder>" \
 --subject "Vote subject" \
 --candidate "Candidate 1" --candidate "etc." \
 --allowed-voter "voter@example.com" --allowed-voter "etc@example.com" \
 --shareholder "shareholder@example.com" --shareholder "etc@example.com" \
 --shareholders-threshold 2
```

#### Shell script / `git`-less setup

Requires `openssl` (LibreSSL CLI is not compatible), `gpg`, and `node`.
Use the `sh/generateNewVoteFolder.sh` script.

```sh
sh/generateNewVoteFolder.sh <path-to-dir>
```

This will generate three files that will be used to let participants vote. You
can then commit those files and push this to a new branch (optionally open the
vote pull request). If you are participating to that vote yourself, you should
cast your vote right away using one of the methods described above.

### Using the API

You can build your own CLI to interface with Caritat so it's more fitted to your
use-case and is more user-friendly.

Since we are using TypeScript, please rely on the type definition for
documentation on how to use the API.

## FAQ

### Who do I need to trust?

- As a Voter, you need to trust the Vote Instigator for:
  - using a reliable hardware and software to generate the Vote Private Key and
    encrypt it, and to not store it anywhere.
  - not leaking the Vote Private Key before the vote closes if they have kept it.
  - not basing their vote in function of what other has voted (having the
    instigator always vote first helps alleviate this issue).
- As a Voter, you need to trust the panel of Secret Holders for:
  - not reconstitue the Vote Private Key before the vote closes.
  - not leaking the Vote Private Key before the vote closes (if they have
    reconstructed it, which they should not do).
  - not basing their vote in function of what other has voted (if they have
    reconstructed the Vote Private Key, which they should not do).
- As a Voter or the Vote Instigator, you need to trust the git commits are genuine,
  and therefor you need to trust that the server hosting the vote repository is
  not compromised.

### Can a participant tamper with the votes?

When using git, one could force push (or otherwise alter the git tree if they
have direct access to the server) the branch and remove or modify
ballots from other participants. Adding protection on the branch on which the
vote is happening can help prevent this.

### When voting using this tool, are my choices public?

Ballots are encrypted using a public key generated for the vote, only someone in
possession for the Vote Private Key is theoretically able to decipher the ballot.
Typically, no one should be in possession of the Vote Prive Key (although
there is no way of ensuring that, see "Who do I need to trust?" section) until
the vote closes. Unless the vote needs to stay private, a recommended practice
is to publish the Vote Private Key, effectively making everyone's choices
public.

Making the non-encrypted ballot available publicly is a great way to ensure the
election was not rigged. Everyone can check that the ballot counted as their has
not been altered and that the result adds up. It's still possible to not make
them public (to keep the vote anonymous), but that requires to trust a single
authority (the Vote Instigator).

### How is a vote initialized?

When setting up the vote, the Vote Instigator creates the following keys:

- the Vote Private Key (RSA 2048 bits)
- the Vote Public Key (derived from the Vote Private Key)
- the Vote Secret (a random binary string)
- the Vote Secret Key Parts (derived from the Vote Secret, as many key parts as
  there are Secret Holders)

Then a `vote.yml` file is created:

- the Vote Public Key,
- the Vote Private Key encrypted using the Vote Secret,
- the Vote Secret Key Parts encrypted using PGP (each key part is encrypted
  using Secret Holder public key),
- a list of candidates (only those candidates are allowed in a ballot),
- a list of allowed Voters,
- a vote subject, header and footer instructions to give more context to the
  voter directly in the ballot,
- the method to count the ballots (only Condorcet is supported at the time of
  writing),
- miscellaneous vote options, such as `canShuffleCandidates`.

The Vote Instigator pushes to a newly created vote branch (when using git) the
`vote.yml`, as well as a file containing the public key and a ballot example.
The two other files can be used to vote without parsing the YAML file.

### Why are the ballots encrypted?

Encrypting the ballot is necessary to ensure people voting early do not
interfere or influence folks voting after them. At the end of the vote, the
the Vote Private Key can be made public, so anyone can decrypt the ballots and verify
the result themself. Or it can decided that the Vote Private Key won't be shared in
order to keep the votes anonymous, and a large enough panel of Secret Holders
(depending on the vote settings) need to share their key parts, decrypt the
ballots, and share the vote result without disclosing the content of the ballots.

### What's inside an encrypted ballot?

An encrypted ballot is a JSON object which contains at least two keys:

- `encryptedSecret`: the Ballot Secret encrypted using the Vote Public Key.
- `data`: the YAML ballot, encrypted using the Ballot Secret.

There could be other keys in that JSON object, they will be ignored.

### How are the votes authenticated?

Voters can sign their commit using PGP. When doing the counting, the system uses
the git commit metadata to attribute a ballot to a voter. If a voter casts
several ballots, the system only counts the most recent one.

### What happens if the Secret Holders lose their key parts?

The vote ballots cannot be deciphered, the process needs to start again (unless
you have a quantum computer at home to break the RSA encryption).

### Could this tool used for any elections?

The license makes no restrictions on how this tool should be used, but keep in
mind that, as any electronic voting system, it can only be trusted as long as
the unanonymized vote ballots are made public as soon as the vote closes, which
may or may not be OK depending on the type of election you are using this for.
