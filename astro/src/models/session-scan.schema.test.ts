import { describe, expect, test } from 'vitest';
import { sessionScanSchema } from './session-scan.schema.ts';

function scanWithVote(vote: string): unknown {
  return [
    {
      votingFilename: '2024-07-08-001.png',
      videoTimestamp: '00:10:00',
      votingSubject: {
        agendaItem: '12.6',
        motionId: 'A123',
        title: 'Example motion',
        type: null,
        authors: [],
      },
      votes: [{ name: 'Supporter', vote }],
    },
  ];
}

describe('sessionScanSchema', () => {
  test.each(['J', 'N', 'E', 'O'])('accepts the vote code %s', (vote) => {
    expect(sessionScanSchema.safeParse(scanWithVote(vote)).success).toBe(true);
  });

  test.each(['?', '', 'j', 'toString'])(
    'rejects the unknown vote code "%s"',
    (vote) => {
      expect(sessionScanSchema.safeParse(scanWithVote(vote)).success).toBe(
        false,
      );
    },
  );
});

function scanWithFourCastVotes(majorityFields: object): unknown {
  return [
    {
      votingFilename: '2024-07-08-001.png',
      videoTimestamp: '00:10:00',
      votingSubject: {
        agendaItem: '1.1',
        motionId: '',
        title: 'Erweiterung der Tagesordnung',
        type: 'Tagesordnung',
        authors: [],
      },
      votes: [
        { name: 'Supporter', vote: 'J' },
        { name: 'Second Supporter', vote: 'J' },
        { name: 'Opposer', vote: 'N' },
        { name: 'Abstainer', vote: 'E' },
        { name: 'Absentee', vote: 'O' },
      ],
      ...majorityFields,
    },
  ];
}

function isValid(majorityFields: object): boolean {
  return sessionScanSchema.safeParse(scanWithFourCastVotes(majorityFields))
    .success;
}

describe('sessionScanSchema majority requirement', () => {
  test('rejects an unknown majority requirement', () => {
    expect(isValid({ majorityRequirement: 'two-thirds' })).toBe(false);
  });
});

describe('sessionScanSchema present members', () => {
  test.each(['majority-of-present', 'two-thirds-of-present'])(
    'rejects %s without present members',
    (majorityRequirement) => {
      expect(isValid({ majorityRequirement })).toBe(false);
    },
  );
});

describe('sessionScanSchema present members against cast votes', () => {
  test('rejects present members below yes, no and abstentions', () => {
    expect(
      isValid({
        majorityRequirement: 'two-thirds-of-present',
        presentMembers: 3,
      }),
    ).toBe(false);
  });

  test('rejects present members below the cast votes without a requirement', () => {
    expect(isValid({ presentMembers: 3 })).toBe(false);
  });

  test('rejects present members that are not a whole number', () => {
    expect(isValid({ presentMembers: 4.5 })).toBe(false);
  });

  test('accepts present members equal to the cast votes', () => {
    expect(
      isValid({
        majorityRequirement: 'two-thirds-of-present',
        presentMembers: 4,
      }),
    ).toBe(true);
  });

  test('accepts present members a requirement does not need', () => {
    expect(
      isValid({
        majorityRequirement: 'majority-of-members',
        presentMembers: 46,
      }),
    ).toBe(true);
  });

  test('accepts a voting without majority fields', () => {
    expect(isValid({})).toBe(true);
  });
});
