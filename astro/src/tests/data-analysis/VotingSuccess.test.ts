import { describe, expect, test } from 'vitest';
import {
  calcVotingSuccessRateOfFaction,
  calcVotingSuccessRateOfPerson,
} from '@data-analysis/VotingSuccess.ts';
import type {
  Registry,
  RegistryFaction,
  RegistryPerson,
} from '@models/registry.ts';
import type { SessionInput } from '@models/SessionInput.ts';
import type { SessionScanItem, SessionScanVote } from '@models/session-scan.ts';

const faction: RegistryFaction = { id: 'f1', name: 'Faction 1', seats: 2 };
const otherFaction: RegistryFaction = {
  id: 'f2',
  name: 'Faction 2',
  seats: 2,
};

function createPerson(name: string, factionId: string): RegistryPerson {
  return { id: name, name, factionId, partyId: 'p', start: null, end: null };
}

const alice = createPerson('Alice', faction.id);
const bob = createPerson('Bob', faction.id);
const carol = createPerson('Carol', otherFaction.id);
const dave = createPerson('Dave', otherFaction.id);

const registry: Registry = {
  id: 'magdeburg-8',
  name: 'Stadtrat Magdeburg 8',
  lastUpdate: '2024-07-08',
  sessions: [],
  parties: [],
  factions: [faction, otherFaction],
  persons: [alice, bob, carol, dave],
};

function createVoting(votes: SessionScanVote[]): SessionScanItem {
  return {
    votingFilename: '2024-07-08-001.png',
    videoTimestamp: '00:10:00',
    votingSubject: {
      agendaItem: '1',
      motionId: 'A1',
      title: 'Ein Antrag',
      type: 'Antrag',
      authors: [],
    },
    votes,
  };
}

function createSessions(votings: SessionScanItem[]): SessionInput[] {
  return [
    {
      session: {
        id: '2024-07-08',
        date: '2024-07-08',
        title: 'Sitzung',
        youtubeUrl: '',
        meetingMinutesUrl: '',
        approved: true,
      },
      votings,
      speeches: [],
    },
  ];
}

describe('calcVotingSuccessRateOfPerson', () => {
  test('counts a yes vote on an accepted voting as success', () => {
    const sessions = createSessions([
      createVoting([
        { name: 'Alice', vote: 'J' },
        { name: 'Carol', vote: 'J' },
        { name: 'Dave', vote: 'N' },
      ]),
    ]);

    expect(calcVotingSuccessRateOfPerson(alice, sessions)).toBe(1);
  });

  test('counts a no vote on a rejected voting as success', () => {
    const sessions = createSessions([
      createVoting([
        { name: 'Alice', vote: 'N' },
        { name: 'Carol', vote: 'N' },
        { name: 'Dave', vote: 'J' },
      ]),
    ]);

    expect(calcVotingSuccessRateOfPerson(alice, sessions)).toBe(1);
  });

  test('counts a yes vote on a tied voting as failure', () => {
    const sessions = createSessions([
      createVoting([
        { name: 'Alice', vote: 'J' },
        { name: 'Carol', vote: 'N' },
      ]),
    ]);

    expect(calcVotingSuccessRateOfPerson(alice, sessions)).toBe(0);
  });

  test('counts an abstention as failure', () => {
    const sessions = createSessions([
      createVoting([
        { name: 'Alice', vote: 'E' },
        { name: 'Carol', vote: 'J' },
      ]),
    ]);

    expect(calcVotingSuccessRateOfPerson(alice, sessions)).toBe(0);
  });
});

describe('calcVotingSuccessRateOfFaction', () => {
  test('counts a voting as success when the faction position matches the result', () => {
    const sessions = createSessions([
      createVoting([
        { name: 'Alice', vote: 'J' },
        { name: 'Bob', vote: 'J' },
        { name: 'Carol', vote: 'J' },
        { name: 'Dave', vote: 'N' },
      ]),
    ]);

    expect(calcVotingSuccessRateOfFaction(registry, faction, sessions)).toBe(1);
  });

  test('counts a voting as failure when the faction position differs from the result', () => {
    const sessions = createSessions([
      createVoting([
        { name: 'Alice', vote: 'N' },
        { name: 'Bob', vote: 'E' },
        { name: 'Carol', vote: 'J' },
        { name: 'Dave', vote: 'J' },
      ]),
    ]);

    expect(calcVotingSuccessRateOfFaction(registry, faction, sessions)).toBe(0);
  });

  test('takes a faction position from a tie among its members as rejection', () => {
    const sessions = createSessions([
      createVoting([
        { name: 'Alice', vote: 'J' },
        { name: 'Bob', vote: 'N' },
        { name: 'Carol', vote: 'N' },
        { name: 'Dave', vote: 'N' },
      ]),
    ]);

    expect(calcVotingSuccessRateOfFaction(registry, faction, sessions)).toBe(1);
  });

  test('counts a voting as failure when no faction member voted', () => {
    const sessions = createSessions([
      createVoting([
        { name: 'Alice', vote: 'O' },
        { name: 'Carol', vote: 'J' },
      ]),
    ]);

    expect(calcVotingSuccessRateOfFaction(registry, faction, sessions)).toBe(0);
  });
});
