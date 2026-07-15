import type { VoteCounts, VotesByFaction } from './voting-breakdown.ts';

export type PaperVotingItem = {
  parliamentPeriodId: string;
  sessionId: string;
  date: string;
  votingId: number;
  agendaItem: string;
  title: string;
  type: string;
  accepted: boolean;
  counts: VoteCounts;
  votesByFactions: VotesByFaction[];
};

// Sorted by the generator: date descending, then votingId ascending.
export type PaperVotingsDto = {
  paperId: number;
  votings: PaperVotingItem[];
};
