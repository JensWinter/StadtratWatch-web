// The codes the session scans persist: Ja, Nein, Enthaltung, O for nicht abgestimmt.
export type VoteCode = 'J' | 'N' | 'E' | 'O';

export type Vote = {
  personId: string;
  vote: VoteCode;
};

export type VotingResult = 'PASSED' | 'REJECTED';
