# Caritat

The name comes from Marie Jean Antoine Nicolas de Caritat, Marquis of Condorcet,
French philosopher and mathematician, notably known for championing an election
method that now named after him.

The goal of this project is to allow organisations of people working remotely to
cast votes is a secure and transparent way, using a git repository collect and
authenticate votes.

## Usage

### Participate to a vote using Caritat

#### Node.js CLI

Requires [Node.js](https://nodejs.org) 16+ and [git](https://git-scm.com).

If the vote is setup on a GitHub pull request and you have
[`gh`](https://cli.github.com) locally installed and logged in to your GitHub
account:

```sh
npx --package=@aduh95/caritat voteOnGitHub <pr-url>
```

Otherwise, you can specify the details manually:

```sh
npx --package=@aduh95/caritat voteUsingGit \
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

Use the `sh/generateNewVoteFolder.sh` script.

```sh
sh/generateNewVoteFolder.sh <path-to-dir>
```

This will generate three files that will be used to let participants vote. You
can then commit those files and push this to a new branch (optionally open the
vote pull request).
If you are participating to that vote yourself, you should cast your vote right away
using one of the methods described above.

## FAQ

### Who do I need to trust?

- As a voter, you need to trust the instigator for:
  - not leaking the private key before the vote closes.
  - not basing their vote in function of what other has voted (the instigator
    should always vote first).
- As a voter or the instigator, you need to trust the git commits are genuine.
  Enforcing GPG signing commits can help with that.

### Can a participant tamper with the votes?

When using git, a participant could force push the branch and remove or modify
ballots from other participants. Adding protection on vote where the vote is
happening can help prevent this.

### When voting using this tool, are my choices public?

Ballots are encrypted using a public key generated for the vote, only someone in
possession for the private key (the vote instigator) is theoretically able to
decipher the ballot. Unless the vote needs to stay private, a recommended
practice is to publish the vote private key, effectively making everyone's
choices public.

Making the non-encrypted ballot available publicly is a great way to ensure the
election was not rigged. Everyone can check that the ballot counted as their has
not been altered and that the result adds up. It's still possible to not make
them public (to keep the vote anonymous), but that requires to trust a single
authority (the vote instigator).

### Why are the ballots encrypted?

Encrypting the ballot is necessary to ensure people voting early do not
interfere or influence folks voting after them. At the end of the vote, the
instigator of the vote can share the private key, so anyone can decrypt the
ballots and verify the result themself. Or the voters can decide that the
private key won't be shared in order to keep the votes anonymous (the instigator
of the vote needs to be able the votes to do the counting, they have to be
trusted).

### How are the votes authenticated?

Voters can sign their commit using GPG. When doing the counting, the system uses
the git commit metadata to attribute a ballot to a voter. If a voter casts
several ballots, the system only counts the most recent one.

### What happens if the vote instigator lose access to the decrypting key?

The vote ballots cannot be deciphered, the process needs to start again (unless
you have a quantum computer at home).
