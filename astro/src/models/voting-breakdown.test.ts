import { describe, expect, test } from 'vitest';
import {
  getVoteCounts,
  getVotesByFactions,
  getVotingId,
  votingAccepted,
} from './voting-breakdown.ts';
import type { Registry } from './registry.ts';
import type { SessionScanItem } from './session-scan.ts';

function createRegistry(): Registry {
  return {
    id: 'magdeburg-8',
    name: 'Stadtrat Magdeburg 8',
    lastUpdate: '2024-07-08',
    sessions: [],
    parties: [],
    factions: [
      { id: 'small', name: 'Small Faction', seats: 2 },
      { id: 'large', name: 'Large Faction', seats: 10 },
      { id: 'empty', name: 'Empty Faction', seats: 5 },
    ],
    persons: [
      {
        id: 'p1',
        name: 'Abstainer',
        factionId: 'large',
        partyId: 'x',
        start: null,
        end: null,
      },
      {
        id: 'p2',
        name: 'Opposer',
        factionId: 'large',
        partyId: 'x',
        start: null,
        end: null,
      },
      {
        id: 'p3',
        name: 'Supporter',
        factionId: 'large',
        partyId: 'x',
        start: null,
        end: null,
      },
      {
        id: 'p4',
        name: 'Absentee',
        factionId: 'large',
        partyId: 'x',
        start: null,
        end: null,
      },
      {
        id: 'p5',
        name: 'Lone Voter',
        factionId: 'small',
        partyId: 'y',
        start: null,
        end: null,
      },
    ],
  };
}

function createVoting(
  votes: { name: string; vote: string }[],
): SessionScanItem {
  return {
    votingFilename: '2024-07-08-001.png',
    videoTimestamp: '00:10:00',
    votingSubject: {
      agendaItem: '12.6',
      motionId: 'A123',
      title: 'Ein Antrag',
      type: 'Antrag',
      authors: [],
    },
    votes,
  };
}

describe('getVotesByFactions', () => {
  test('orders factions by seats descending', () => {
    const votesByFactions = getVotesByFactions(createRegistry(), []);

    expect(votesByFactions.map((f) => f.factionId)).toEqual([
      'large',
      'empty',
      'small',
    ]);
  });

  test('assigns orderIndex following the seat order', () => {
    const votesByFactions = getVotesByFactions(createRegistry(), []);

    expect(votesByFactions.map((f) => f.orderIndex)).toEqual([0, 1, 2]);
  });

  test('keeps factions without votes with an empty vote list', () => {
    const votesByFactions = getVotesByFactions(createRegistry(), [
      { name: 'Lone Voter', vote: 'J' },
    ]);

    const emptyFaction = votesByFactions.find((f) => f.factionId === 'empty');
    expect(emptyFaction?.votes).toEqual([]);
  });

  test('orders votes within a faction as yes, no, abstention, then anything else', () => {
    const votesByFactions = getVotesByFactions(createRegistry(), [
      { name: 'Absentee', vote: 'O' },
      { name: 'Abstainer', vote: 'E' },
      { name: 'Opposer', vote: 'N' },
      { name: 'Supporter', vote: 'J' },
    ]);

    const largeFaction = votesByFactions.find((f) => f.factionId === 'large');
    expect(largeFaction?.votes).toEqual([
      { personName: 'Supporter', vote: 'J' },
      { personName: 'Opposer', vote: 'N' },
      { personName: 'Abstainer', vote: 'E' },
      { personName: 'Absentee', vote: 'O' },
    ]);
  });

  test('groups each vote under the faction of the voting person', () => {
    const votesByFactions = getVotesByFactions(createRegistry(), [
      { name: 'Supporter', vote: 'J' },
      { name: 'Lone Voter', vote: 'N' },
    ]);

    expect(votesByFactions.find((f) => f.factionId === 'large')?.votes).toEqual(
      [{ personName: 'Supporter', vote: 'J' }],
    );
    expect(votesByFactions.find((f) => f.factionId === 'small')?.votes).toEqual(
      [{ personName: 'Lone Voter', vote: 'N' }],
    );
  });

  test('exposes the faction name alongside the id', () => {
    const votesByFactions = getVotesByFactions(createRegistry(), []);

    expect(votesByFactions[0]).toMatchObject({
      factionId: 'large',
      factionName: 'Large Faction',
    });
  });

  test('sorts unrecognized votes last, even when they collide with object property names', () => {
    const votesByFactions = getVotesByFactions(createRegistry(), [
      { name: 'Abstainer', vote: 'toString' },
      { name: 'Supporter', vote: 'J' },
    ]);

    const largeFaction = votesByFactions.find((f) => f.factionId === 'large');
    expect(largeFaction?.votes).toEqual([
      { personName: 'Supporter', vote: 'J' },
      { personName: 'Abstainer', vote: 'toString' },
    ]);
  });

  test('fails when a vote references an unknown person', () => {
    expect(() =>
      getVotesByFactions(createRegistry(), [{ name: 'Ghost', vote: 'J' }]),
    ).toThrow('Person Ghost not found');
  });
});

describe('getVotingId', () => {
  test('reads the voting id encoded in the scan filename', () => {
    expect(getVotingId(createVoting([]))).toBe(1);
  });

  test('reads a multi-digit voting id', () => {
    const voting = createVoting([]);
    voting.votingFilename = '2024-07-08-014.png';

    expect(getVotingId(voting)).toBe(14);
  });
});

describe('getVoteCounts', () => {
  test('counts each vote result, treating anything unrecognized as not voted', () => {
    const voting = createVoting([
      { name: 'Supporter', vote: 'J' },
      { name: 'Lone Voter', vote: 'J' },
      { name: 'Opposer', vote: 'N' },
      { name: 'Abstainer', vote: 'E' },
      { name: 'Absentee', vote: 'O' },
    ]);

    expect(getVoteCounts(voting)).toEqual({ J: 2, N: 1, E: 1, O: 1 });
  });

  test('counts a voting without votes as all zero', () => {
    expect(getVoteCounts(createVoting([]))).toEqual({ J: 0, N: 0, E: 0, O: 0 });
  });
});

describe('votingAccepted', () => {
  test('accepts a voting with more yes than no votes', () => {
    const voting = createVoting([
      { name: 'Supporter', vote: 'J' },
      { name: 'Opposer', vote: 'N' },
      { name: 'Lone Voter', vote: 'J' },
    ]);

    expect(votingAccepted(voting)).toBe(true);
  });

  test('rejects a voting with a tie', () => {
    const voting = createVoting([
      { name: 'Supporter', vote: 'J' },
      { name: 'Opposer', vote: 'N' },
    ]);

    expect(votingAccepted(voting)).toBe(false);
  });

  test('rejects a voting with more no than yes votes', () => {
    const voting = createVoting([
      { name: 'Opposer', vote: 'N' },
      { name: 'Lone Voter', vote: 'N' },
      { name: 'Supporter', vote: 'J' },
    ]);

    expect(votingAccepted(voting)).toBe(false);
  });

  test('ignores abstentions and non-votes when comparing', () => {
    const voting = createVoting([
      { name: 'Supporter', vote: 'J' },
      { name: 'Abstainer', vote: 'E' },
      { name: 'Absentee', vote: 'O' },
    ]);

    expect(votingAccepted(voting)).toBe(true);
  });
});
