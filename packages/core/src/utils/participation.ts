import type { Actor } from "../vote.js";

export default function getParticipation(
  authorizedVoters: Actor[],
  ballotCount: number
): number {
  const expectedVotes = authorizedVoters ? authorizedVoters.length : 0;
  if (expectedVotes === 0) return 1;
  const participation = ballotCount / authorizedVoters.length;
  if (participation > 1) throw new Error("More ballots than authorized voters");
  return participation;
}
