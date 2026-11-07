import { isVoteCode, type VoteCode } from './Session.ts';

export type SessionScan = SessionScanItem[];

export type SessionScanItem = {
  votingFilename: string;
  videoTimestamp: string;
  votingSubject: SessionScanVotingSubject;
  votes: SessionScanVote[];
  majorityRequirement?: MajorityRequirement;
  presentMembers?: number;
};

// Without a majorityRequirement a voting needs a simple majority.
export const majorityRequirements = [
  'simple',
  'majority-of-present',
  'two-thirds-of-present',
  'majority-of-members',
  'two-thirds-of-members',
  'three-quarters-of-members',
] as const;

export type MajorityRequirement = (typeof majorityRequirements)[number];

export const majorityRequirementDisplayNames: Record<
  MajorityRequirement,
  string
> = {
  simple: 'Einfache Mehrheit',
  'majority-of-present': 'Mehrheit der anwesenden Mitglieder',
  'two-thirds-of-present': 'Zwei Drittel der anwesenden Mitglieder',
  'majority-of-members': 'Mehrheit der Mitglieder',
  'two-thirds-of-members': 'Zwei Drittel der Mitglieder',
  'three-quarters-of-members': 'Drei Viertel der Mitglieder',
};

// Null for a simple majority, which the pages leave unnamed.
export function qualifiedMajorityDisplayName(
  voting: SessionScanItem,
): string | null {
  const majorityRequirement = voting.majorityRequirement ?? 'simple';
  return majorityRequirement === 'simple'
    ? null
    : majorityRequirementDisplayNames[majorityRequirement];
}

function isMajorityRequirement(value: unknown): value is MajorityRequirement {
  return (majorityRequirements as readonly unknown[]).includes(value);
}

function requiresPresentMembers(
  majorityRequirement: MajorityRequirement | undefined,
): boolean {
  return (
    majorityRequirement === 'majority-of-present' ||
    majorityRequirement === 'two-thirds-of-present'
  );
}

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

// Shared by the Astro content schema and the script loaders, so both reject the
// same hand-corrected scans.
export function findPresentMembersViolation(
  voting: SessionScanItem,
): string | undefined {
  // A presentMembers the requirement does not need stays as observed and is
  // ignored, so a corrected voting keeps it without being checked.
  if (!requiresPresentMembers(voting.majorityRequirement)) {
    return undefined;
  }
  if (voting.presentMembers === undefined) {
    return `majority requirement "${voting.majorityRequirement}" requires presentMembers`;
  }
  if (!Number.isInteger(voting.presentMembers)) {
    return `presentMembers ${voting.presentMembers} is not a whole number`;
  }
  const castVotes = voting.votes.filter((vote) => vote.vote !== 'O').length;
  if (voting.presentMembers < castVotes) {
    return `presentMembers ${voting.presentMembers} is below the ${castVotes} cast votes (yes + no + abstentions)`;
  }
  return undefined;
}

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

// Scans are corrected by hand, so their JSON can hold a requirement the type
// rules out or a presentMembers that cannot be right.
export function assertValidMajorityRequirements(
  sessionScan: SessionScan,
  source: string,
): void {
  for (const voting of sessionScan) {
    if (
      voting.majorityRequirement !== undefined &&
      !isMajorityRequirement(voting.majorityRequirement)
    ) {
      throw new Error(
        `${source}: unknown majority requirement "${voting.majorityRequirement}" in ${voting.votingFilename}`,
      );
    }
    const violation = findPresentMembersViolation(voting);
    if (violation) {
      throw new Error(`${source}: ${violation} in ${voting.votingFilename}`);
    }
  }
}

export function assertValidSessionScan(
  sessionScan: SessionScan,
  source: string,
): void {
  assertKnownVoteCodes(sessionScan, source);
  assertValidMajorityRequirements(sessionScan, source);
}
