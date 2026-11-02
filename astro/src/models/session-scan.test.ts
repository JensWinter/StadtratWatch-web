import { describe, expect, test } from 'vitest';
import { assertKnownVoteCodes, type SessionScan } from './session-scan.ts';

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
