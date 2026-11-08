import { describe, expect, it } from 'bun:test';

import type { Registry } from '@srw-astro/models/registry';
import type { SessionInput } from '@srw-astro/models/session-input';
import type { SessionScanItem, SessionScanVote } from '@srw-astro/models/session-scan';

import type { Voting } from './model.ts';
import { VotingsImageDataGenerator } from './votings-image-data-generator.ts';

const registry: Registry = {
  id: 'magdeburg-8',
  name: 'Stadtrat Magdeburg 8',
  lastUpdate: '2024-07-08',
  sessions: [],
  parties: [],
  factions: [{ id: 'f1', name: 'Faction 1', seats: 3 }],
  persons: ['Alice', 'Bob', 'Carol'].map((name) => ({
    id: name,
    name,
    factionId: 'f1',
    partyId: 'p',
    start: null,
    end: null,
  })),
};

type MajorityFields = Pick<SessionScanItem, 'majorityRequirement' | 'presentMembers'>;

function createSessionInput(votes: SessionScanVote[], majorityFields: MajorityFields = {}): SessionInput {
  return {
    session: {
      id: '2024-07-08',
      date: '2024-07-08',
      title: 'Sitzung',
      youtubeUrl: '',
      meetingMinutesUrl: '',
      approved: true,
    },
    votings: [
      {
        votingFilename: '2024-07-08-001.png',
        videoTimestamp: '00:10:00',
        votingSubject: { agendaItem: '1', motionId: 'A1', title: 'Ein Antrag', type: 'Antrag', authors: [] },
        votes,
        ...majorityFields,
      },
    ],
    speeches: [],
  };
}

function generateVoting(votes: SessionScanVote[], majorityFields?: MajorityFields): Voting | undefined {
  const [voting] = new VotingsImageDataGenerator().generateVotingsImageData(registry, [
    createSessionInput(votes, majorityFields),
  ]);
  return voting;
}

function generateAccepted(votes: SessionScanVote[]): boolean | undefined {
  return generateVoting(votes)?.accepted;
}

describe('VotingsImageDataGenerator', () => {
  it('marks a voting with more yes than no votes as accepted', () => {
    expect(
      generateAccepted([
        { name: 'Alice', vote: 'J' },
        { name: 'Bob', vote: 'J' },
        { name: 'Carol', vote: 'N' },
      ]),
    ).toBe(true);
  });

  it('marks a tied voting as rejected', () => {
    expect(
      generateAccepted([
        { name: 'Alice', vote: 'J' },
        { name: 'Bob', vote: 'N' },
        { name: 'Carol', vote: 'E' },
      ]),
    ).toBe(false);
  });

  it('marks a two-thirds voting with more yes than no votes as rejected when the yes votes miss the threshold', () => {
    const voting = generateVoting(
      [
        { name: 'Alice', vote: 'J' },
        { name: 'Bob', vote: 'J' },
        { name: 'Carol', vote: 'N' },
      ],
      { majorityRequirement: 'two-thirds-of-present', presentMembers: 4 },
    );
    expect(voting?.accepted).toBe(false);
    expect(voting?.majorityRequirement).toBe('two-thirds-of-present');
  });

  it('assumes the simple majority for a voting without a majority requirement', () => {
    expect(generateVoting([{ name: 'Alice', vote: 'J' }])?.majorityRequirement).toBe('simple');
  });
});
