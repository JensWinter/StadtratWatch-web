import type { MajorityRequirement } from '@srw-astro/models/session-scan';

export type Voting = {
  sessionId: string;
  votingId: number;
  date: string;
  motionType: string;
  motionId: string;
  subjectTitle: string;
  accepted: boolean;
  majorityRequirement: MajorityRequirement;
  votes: VotingPerFaction[];
};

export type VotingPerFaction = {
  faction: string;
  votesFor: number;
  votesAgainst: number;
  abstentions: number;
  notVoted: number;
};
