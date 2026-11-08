import type { MajorityRequirement } from '@models/session-scan';

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
