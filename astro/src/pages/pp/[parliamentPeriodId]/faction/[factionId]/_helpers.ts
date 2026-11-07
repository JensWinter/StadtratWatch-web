export type MotionResult = 'ACCEPTED' | 'PARTIALLY_ACCEPTED' | 'REJECTED';

export function getVotingId(votings: { votingId: number }[]): number {
  return votings.toSorted((a, b) => a.votingId - b.votingId)[0].votingId;
}

export function getMotionResult(
  votings: { accepted: boolean }[],
): MotionResult {
  const acceptedVotings = votings.filter((voting) => voting.accepted).length;

  if (acceptedVotings === 0) {
    return 'REJECTED';
  }

  return acceptedVotings === votings.length ? 'ACCEPTED' : 'PARTIALLY_ACCEPTED';
}
