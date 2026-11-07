import { describe, expect, test } from 'vitest';
import {
  assertKnownVoteCodes,
  assertValidMajorityRequirements,
  assertValidSessionScan,
  qualifiedMajorityDisplayName,
  type SessionScan,
} from './session-scan.ts';

function scanWithVote(vote: string): SessionScan {
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
  ] as SessionScan;
}

describe('assertKnownVoteCodes', () => {
  test.each(['J', 'N', 'E', 'O'])('accepts the vote code %s', (vote) => {
    expect(() =>
      assertKnownVoteCodes(scanWithVote(vote), 'session-scan.json'),
    ).not.toThrow();
  });

  test.each(['?', '', 'j', 'toString'])(
    'rejects the unknown vote code "%s"',
    (vote) => {
      expect(() =>
        assertKnownVoteCodes(scanWithVote(vote), 'session-scan.json'),
      ).toThrow();
    },
  );

  test('names the file, voting and councillor of an unknown vote code', () => {
    expect(() =>
      assertKnownVoteCodes(scanWithVote('?'), 'session-scan.json'),
    ).toThrow(
      'session-scan.json: unknown vote code "?" for Supporter in 2024-07-08-001.png',
    );
  });
});

function scanWithMajority(majority: Record<string, unknown>): SessionScan {
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
  ] as SessionScan;
}

describe('assertValidMajorityRequirements', () => {
  test.each([
    {},
    { majorityRequirement: 'simple' },
    { majorityRequirement: 'two-thirds-of-members' },
    { majorityRequirement: 'two-thirds-of-present', presentMembers: 3 },
    { presentMembers: 50 },
  ])('accepts %o', (majority) => {
    expect(() =>
      assertValidMajorityRequirements(
        scanWithMajority(majority),
        'session-scan.json',
      ),
    ).not.toThrow();
  });

  test('rejects an unknown majority requirement, naming file and voting', () => {
    expect(() =>
      assertValidMajorityRequirements(
        scanWithMajority({ majorityRequirement: 'two-thirds' }),
        'session-scan.json',
      ),
    ).toThrow(
      'session-scan.json: unknown majority requirement "two-thirds" in 2024-07-08-001.png',
    );
  });

  test.each(['majority-of-present', 'two-thirds-of-present'])(
    'rejects %s without presentMembers, naming file, voting and rule',
    (majorityRequirement) => {
      expect(() =>
        assertValidMajorityRequirements(
          scanWithMajority({ majorityRequirement }),
          'session-scan.json',
        ),
      ).toThrow(
        `session-scan.json: majority requirement "${majorityRequirement}" requires presentMembers in 2024-07-08-001.png`,
      );
    },
  );

  test('rejects a fractional presentMembers', () => {
    expect(() =>
      assertValidMajorityRequirements(
        scanWithMajority({ presentMembers: 3.5 }),
        'session-scan.json',
      ),
    ).toThrow(
      'session-scan.json: presentMembers 3.5 is not a whole number in 2024-07-08-001.png',
    );
  });

  test('rejects presentMembers below yes + no + abstentions', () => {
    expect(() =>
      assertValidMajorityRequirements(
        scanWithMajority({
          majorityRequirement: 'two-thirds-of-present',
          presentMembers: 2,
        }),
        'session-scan.json',
      ),
    ).toThrow(
      'session-scan.json: presentMembers 2 is below the 3 cast votes (yes + no + abstentions) in 2024-07-08-001.png',
    );
  });
});

describe('assertValidSessionScan', () => {
  test('rejects an unknown vote code', () => {
    expect(() =>
      assertValidSessionScan(scanWithVote('?'), 'session-scan.json'),
    ).toThrow('unknown vote code "?"');
  });

  test('rejects an unknown majority requirement', () => {
    expect(() =>
      assertValidSessionScan(
        scanWithMajority({ majorityRequirement: 'two-thirds' }),
        'session-scan.json',
      ),
    ).toThrow('unknown majority requirement "two-thirds"');
  });
});

describe('qualifiedMajorityDisplayName', () => {
  test.each([{}, { majorityRequirement: 'simple' }])(
    'names no requirement for a simple majority %o',
    (majority) => {
      expect(qualifiedMajorityDisplayName(scanWithMajority(majority)[0])).toBe(
        null,
      );
    },
  );

  test('names a qualified majority in German', () => {
    const voting = scanWithMajority({
      majorityRequirement: 'two-thirds-of-present',
      presentMembers: 46,
    })[0];

    expect(qualifiedMajorityDisplayName(voting)).toBe(
      'Zwei Drittel der anwesenden Mitglieder',
    );
  });
});
