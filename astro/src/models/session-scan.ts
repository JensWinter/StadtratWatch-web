import type { VoteCode } from './Session.ts';

export type SessionScan = SessionScanItem[];

export type SessionScanItem = {
  votingFilename: string;
  videoTimestamp: string;
  votingSubject: SessionScanVotingSubject;
  votes: SessionScanVote[];
};

export type SessionScanVotingSubject = {
  agendaItem: string;
  motionId: string;
  title: string;
  type: string | null; // TODO: remove null?
  authors: string[];
};

export type SessionScanVote = {
  name: string;
  vote: VoteCode;
};
