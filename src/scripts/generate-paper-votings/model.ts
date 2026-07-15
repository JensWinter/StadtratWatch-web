import { VoteCounts, VotesByFaction } from '@srw-astro/models/voting-breakdown';

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

export type PaperVotingsDto = {
  paperId: number;
  votings: PaperVotingItem[];
};

export type PaperVotingsAssetDto = {
  batchNo: string;
  paperVotings: PaperVotingsDto[];
};
