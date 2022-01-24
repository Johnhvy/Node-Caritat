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

<!-- TODO -->

WIP

#### Shell scripts

You can use one of the shell script from the `sh/` folder. Requires `openssl`
and `git` to be available on the local machine, and some prior knowledge of
those tools by the user.

#### Web UI (coming (maybe) later)

Not currently available. Caritat uses only Web-compatible APIs for the voting
process, the goal is to have a web UI that allows to vote from the web. If you'd
like to help, please chime in.

### Setup a vote using Caritat

<!-- TODO -->

That's very much a manual process for the time being, the plan is to have a CLI
helping with that in the future.

## FAQ

### Who do I need to trust?

- As a voter, you need to trust the instigator for:
  - not leaking the private key before the vote closes.
  - not basing their vote in function of what other has voted (the instigator
    should always vote first).
- As a voter or the instigator, you need to trust the git commits are genuine.
  Enforcing GPG signing commits can help with that.

### Do the ballots need to be public?

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
