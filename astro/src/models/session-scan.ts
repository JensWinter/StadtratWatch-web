import { isVoteCode, type VoteCode } from './Session.ts';

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

// Scans are corrected by hand, so their JSON can hold codes the type rules out.
export function assertKnownVoteCodes(
  sessionScan: SessionScan,
  source: string,
): void {
  for (const voting of sessionScan) {
    for (const vote of voting.votes) {
      if (!isVoteCode(vote.vote)) {
        throw new Error(
          `${source}: unknown vote code "${vote.vote}" for ${vote.name} in ${voting.votingFilename}`,
        );
      }
    }
  }
}
