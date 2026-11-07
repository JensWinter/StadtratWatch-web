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

function scanWithMajority(majority: Record<string, unknown>): unknown {
  return [
    {
      votingFilename: '2024-07-08-001.png',
      videoTimestamp: '00:10:00',
      votingSubject: {
        agendaItem: '2.1',
        motionId: 'A123',
        title: 'Erweiterung der Tagesordnung',
        type: 'Tagesordnung',
        authors: [],
      },
      votes: [
        { name: 'Supporter', vote: 'J' },
        { name: 'Opposer', vote: 'N' },
        { name: 'Abstainer', vote: 'E' },
        { name: 'Absentee', vote: 'O' },
      ],
      ...majority,
    },
  ];
}

describe('sessionScanSchema majority requirement', () => {
  test.each([
    'simple',
    'majority-of-members',
    'two-thirds-of-members',
    'three-quarters-of-members',
  ])('accepts %s without presentMembers', (majorityRequirement) => {
    expect(
      sessionScanSchema.safeParse(scanWithMajority({ majorityRequirement }))
        .success,
    ).toBe(true);
  });

  test('accepts a voting without the new fields', () => {
    expect(sessionScanSchema.safeParse(scanWithMajority({})).success).toBe(
      true,
    );
  });

  test('rejects an unknown majority requirement', () => {
    expect(
      sessionScanSchema.safeParse(
        scanWithMajority({ majorityRequirement: 'two-thirds' }),
      ).success,
    ).toBe(false);
  });

  test.each(['majority-of-present', 'two-thirds-of-present'])(
    'rejects %s without presentMembers',
    (majorityRequirement) => {
      expect(
        sessionScanSchema.safeParse(scanWithMajority({ majorityRequirement }))
          .success,
      ).toBe(false);
    },
  );

  test('rejects presentMembers below yes + no + abstentions', () => {
    expect(
      sessionScanSchema.safeParse(
        scanWithMajority({
          majorityRequirement: 'two-thirds-of-present',
          presentMembers: 2,
        }),
      ).success,
    ).toBe(false);
  });

  test.each([{ presentMembers: 2 }, { presentMembers: 3.5 }])(
    'ignores an impossible presentMembers the requirement does not need %o',
    (majority) => {
      expect(
        sessionScanSchema.safeParse(scanWithMajority(majority)).success,
      ).toBe(true);
    },
  );

  test('accepts presentMembers equal to yes + no + abstentions', () => {
    expect(
      sessionScanSchema.safeParse(
        scanWithMajority({
          majorityRequirement: 'two-thirds-of-present',
          presentMembers: 3,
        }),
      ).success,
    ).toBe(true);
  });

  test.each(['majority-of-present', 'two-thirds-of-present'])(
    'accepts a surplus presentMembers on %s',
    (majorityRequirement) => {
      expect(
        sessionScanSchema.safeParse(
          scanWithMajority({ majorityRequirement, presentMembers: 50 }),
        ).success,
      ).toBe(true);
    },
  );

  test('accepts a surplus presentMembers on a simple majority', () => {
    expect(
      sessionScanSchema.safeParse(scanWithMajority({ presentMembers: 50 }))
        .success,
    ).toBe(true);
  });

  test('rejects a fractional presentMembers', () => {
    expect(
      sessionScanSchema.safeParse(
        scanWithMajority({
          majorityRequirement: 'majority-of-present',
          presentMembers: 3.5,
        }),
      ).success,
    ).toBe(false);
  });
});
