import type { VotesByFaction } from '@models/voting-breakdown.ts';

export type VotingListItem = {
  id: number;
  agendaItem: string;
  motionId: string;
  title: string;
  type: string | null;
  authors: string[];
  votesByFactions: VotesByFaction[];
  accepted: boolean;
};
