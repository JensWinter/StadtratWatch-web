import type { VotingResult } from '@models/Session.ts';
import type { SessionScanVote } from '@models/session-scan.ts';

export type MotionResult = 'ACCEPTED' | 'PARTIALLY_ACCEPTED' | 'REJECTED';

export function getVotingResult(votes: SessionScanVote[]): VotingResult {
  const votedFor = votes.filter((vote) => vote.vote === 'J').length;
  const votedAgainst = votes.filter((vote) => vote.vote === 'N').length;
  return votedFor > votedAgainst ? 'PASSED' : 'REJECTED';
}

export function getVotingId(votings: { votingId: number }[]): number {
  return votings.toSorted((a, b) => a.votingId - b.votingId)[0].votingId;
}

export function getMotionResult(
  votings: { votingResult: VotingResult }[],
): MotionResult {
  const passedVotings = votings.filter(
    (voting) => voting.votingResult === 'PASSED',
  ).length;

  if (passedVotings === 0) {
    return 'REJECTED';
  }

  return passedVotings === votings.length ? 'ACCEPTED' : 'PARTIALLY_ACCEPTED';
}
