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
