// PROTOTYPE — wipe me. Throwaway for "Darstellung von Mehrheitserfordernis und Abstimmungsergebnis" (#621).
// Fakes the two scan fields decided in #620 for a few real votings and computes the result as decided in #619.
import type { SessionScanItem } from '@models/session-scan';

export type MajorityRequirement =
  | 'simple'
  | 'majority-of-present'
  | 'two-thirds-of-present'
  | 'majority-of-members'
  | 'two-thirds-of-members'
  | 'three-quarters-of-members';

const STATUTORY_MEMBERS = 57;

const fakeScanFields: Record<string, { majorityRequirement: MajorityRequirement; presentMembers?: number }> = {
  '2026-08-27-001.png': { majorityRequirement: 'two-thirds-of-present', presentMembers: 46 },
  '2026-08-27-002.png': { majorityRequirement: 'two-thirds-of-present', presentMembers: 46 },
  '2026-08-27-003.png': { majorityRequirement: 'two-thirds-of-present', presentMembers: 46 },
  '2026-08-27-004.png': { majorityRequirement: 'two-thirds-of-present', presentMembers: 46 },
  '2026-08-27-019.png': { majorityRequirement: 'majority-of-members' },
  '2026-05-21-001.png': { majorityRequirement: 'two-thirds-of-present', presentMembers: 47 },
};

export const requirementLabel: Record<MajorityRequirement, string> = {
  simple: 'Einfache Mehrheit',
  'majority-of-present': 'Mehrheit der anwesenden Mitglieder',
  'two-thirds-of-present': 'Zwei Drittel der anwesenden Mitglieder',
  'majority-of-members': 'Mehrheit der Mitglieder',
  'two-thirds-of-members': 'Zwei Drittel der Mitglieder',
  'three-quarters-of-members': 'Drei Viertel der Mitglieder',
};

export const requirementShortLabel: Record<MajorityRequirement, string> = {
  simple: 'einfach',
  'majority-of-present': '> ½ anw.',
  'two-thirds-of-present': '⅔ anw.',
  'majority-of-members': '> ½ Mitgl.',
  'two-thirds-of-members': '⅔ Mitgl.',
  'three-quarters-of-members': '¾ Mitgl.',
};

export type PrototypeResult = {
  requirement: MajorityRequirement;
  isQualified: boolean;
  yes: number;
  no: number;
  abstain: number;
  notVoted: number;
  referenceSize: number | null;
  referenceLabel: string | null;
  requiredYes: number | null;
  accepted: boolean;
  acceptedBySimpleMajority: boolean;
  qualifiedMajorityMissed: boolean;
};

export function computePrototypeResult(voting: SessionScanItem): PrototypeResult {
  const fields = fakeScanFields[voting.votingFilename];
  const requirement = fields?.majorityRequirement ?? 'simple';
  const count = (code: string) => voting.votes.filter((vote) => vote.vote === code).length;
  const yes = count('J');
  const no = count('N');
  const abstain = count('E');
  const notVoted = count('O');
  const acceptedBySimpleMajority = yes > no;

  const { referenceSize, referenceLabel, requiredYes } = threshold(requirement, fields?.presentMembers);
  const accepted = requiredYes === null ? acceptedBySimpleMajority : yes >= requiredYes;

  return {
    requirement,
    isQualified: requirement !== 'simple',
    yes,
    no,
    abstain,
    notVoted,
    referenceSize,
    referenceLabel,
    requiredYes,
    accepted,
    acceptedBySimpleMajority,
    qualifiedMajorityMissed: acceptedBySimpleMajority && !accepted,
  };
}

function threshold(requirement: MajorityRequirement, presentMembers: number | undefined) {
  const present = presentMembers ?? 0;
  switch (requirement) {
    case 'simple':
      return { referenceSize: null, referenceLabel: null, requiredYes: null };
    case 'majority-of-present':
      return { referenceSize: present, referenceLabel: 'anwesende Mitglieder', requiredYes: Math.floor(present / 2) + 1 };
    case 'two-thirds-of-present':
      return { referenceSize: present, referenceLabel: 'anwesende Mitglieder', requiredYes: Math.ceil((2 * present) / 3) };
    case 'majority-of-members':
      return { referenceSize: STATUTORY_MEMBERS, referenceLabel: 'Mitglieder', requiredYes: Math.floor(STATUTORY_MEMBERS / 2) + 1 };
    case 'two-thirds-of-members':
      return { referenceSize: STATUTORY_MEMBERS, referenceLabel: 'Mitglieder', requiredYes: Math.ceil((2 * STATUTORY_MEMBERS) / 3) };
    case 'three-quarters-of-members':
      return { referenceSize: STATUTORY_MEMBERS, referenceLabel: 'Mitglieder', requiredYes: Math.ceil((3 * STATUTORY_MEMBERS) / 4) };
  }
}
