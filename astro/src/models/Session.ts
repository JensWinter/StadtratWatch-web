// The codes the session scans persist: Ja, Nein, Enthaltung, O for nicht abgestimmt.
export const voteCodes = ['J', 'N', 'E', 'O'] as const;

export type VoteCode = (typeof voteCodes)[number];

export function isVoteCode(value: string): value is VoteCode {
  return (voteCodes as readonly string[]).includes(value);
}

export type Vote = {
  personId: string;
  vote: VoteCode;
};

export type VotingResult = 'PASSED' | 'REJECTED';
