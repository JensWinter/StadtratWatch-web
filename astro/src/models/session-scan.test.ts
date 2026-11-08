import { describe, expect, test } from 'vitest';
import { assertValidSessionScan, type SessionScan } from './session-scan.ts';

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

describe('assertValidSessionScan', () => {
  test.each(['J', 'N', 'E', 'O'])('accepts the vote code %s', (vote) => {
    expect(() =>
      assertValidSessionScan(scanWithVote(vote), 'session-scan.json'),
    ).not.toThrow();
  });

  test.each(['?', '', 'j', 'toString'])(
    'rejects the unknown vote code "%s"',
    (vote) => {
      expect(() =>
        assertValidSessionScan(scanWithVote(vote), 'session-scan.json'),
      ).toThrow();
    },
  );

  test('names the file, voting and councillor of an unknown vote code', () => {
    expect(() =>
      assertValidSessionScan(scanWithVote('?'), 'session-scan.json'),
    ).toThrow(
      'session-scan.json: unknown vote code "?" for Supporter in 2024-07-08-001.png',
    );
  });
});

function scanWithFourCastVotes(majorityFields: object): SessionScan {
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
  ] as SessionScan;
}

function validate(majorityFields: object): () => void {
  return () =>
    assertValidSessionScan(
      scanWithFourCastVotes(majorityFields),
      'session-scan.json',
    );
}

describe('assertValidSessionScan majority requirement', () => {
  test('rejects an unknown majority requirement, naming file, voting and rule', () => {
    expect(validate({ majorityRequirement: 'two-thirds' })).toThrow(
      'session-scan.json: unknown majority requirement "two-thirds" in 2024-07-08-001.png',
    );
  });

  test.each(['majority-of-present', 'two-thirds-of-present'])(
    'rejects %s without present members, naming file, voting and rule',
    (majorityRequirement) => {
      expect(validate({ majorityRequirement })).toThrow(
        `session-scan.json: majority requirement "${majorityRequirement}" needs presentMembers in 2024-07-08-001.png`,
      );
    },
  );

  test('rejects present members below the cast votes, naming file, voting and rule', () => {
    expect(
      validate({
        majorityRequirement: 'two-thirds-of-present',
        presentMembers: 3,
      }),
    ).toThrow(
      'session-scan.json: presentMembers 3 is below the 4 cast votes in 2024-07-08-001.png',
    );
  });

  test('rejects present members that are not a whole number', () => {
    expect(validate({ presentMembers: 4.5 })).toThrow(
      'session-scan.json: presentMembers 4.5 is not a whole number in 2024-07-08-001.png',
    );
  });

  test('accepts present members equal to the cast votes', () => {
    expect(
      validate({
        majorityRequirement: 'two-thirds-of-present',
        presentMembers: 4,
      }),
    ).not.toThrow();
  });

  test('accepts present members a requirement does not need', () => {
    expect(
      validate({
        majorityRequirement: 'majority-of-members',
        presentMembers: 46,
      }),
    ).not.toThrow();
  });

  test('accepts a voting without majority fields', () => {
    expect(validate({})).not.toThrow();
  });
});
