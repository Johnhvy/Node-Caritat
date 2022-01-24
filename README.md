# Caritat

The name comes from Marie Jean Antoine Nicolas de Caritat, Marquis of Condorcet,
French philosopher and mathematician, notably known for championing an election
method that now named after him.

The goal of this project is to allow organisations of people working remotely to
cast votes is a secure and transparent way, using a git repository collect and
authenticate votes.

## Usage

### Participate to a vote using Caritat

<!-- TODO -->

### Setup a vote using Caritat

<!-- TODO -->

## FAQ

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
