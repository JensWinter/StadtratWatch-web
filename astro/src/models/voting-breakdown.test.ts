import { describe, expect, test } from 'vitest';
import {
  getVoteCounts,
  getVotesByFactions,
  getVotingId,
  votingAccepted,
} from './voting-breakdown.ts';
import type { Registry } from './registry.ts';
import type { SessionScanItem, SessionScanVote } from './session-scan.ts';

const magdeburgLegalMemberCount = 57;

function createRegistry(): Registry {
  return {
    id: 'magdeburg-8',
    name: 'Stadtrat Magdeburg 8',
    lastUpdate: '2024-07-08',
    legalMemberCount: 57,
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

function createVoting(votes: SessionScanVote[]): SessionScanItem {
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
  test('counts each vote code', () => {
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

    expect(votingAccepted(voting, magdeburgLegalMemberCount)).toBe(true);
  });

  test('rejects a voting with a tie', () => {
    const voting = createVoting([
      { name: 'Supporter', vote: 'J' },
      { name: 'Opposer', vote: 'N' },
    ]);

    expect(votingAccepted(voting, magdeburgLegalMemberCount)).toBe(false);
  });

  test('rejects a voting with more no than yes votes', () => {
    const voting = createVoting([
      { name: 'Opposer', vote: 'N' },
      { name: 'Lone Voter', vote: 'N' },
      { name: 'Supporter', vote: 'J' },
    ]);

    expect(votingAccepted(voting, magdeburgLegalMemberCount)).toBe(false);
  });

  test('ignores abstentions and non-votes when comparing', () => {
    const voting = createVoting([
      { name: 'Supporter', vote: 'J' },
      { name: 'Abstainer', vote: 'E' },
      { name: 'Absentee', vote: 'O' },
    ]);

    expect(votingAccepted(voting, magdeburgLegalMemberCount)).toBe(true);
  });
});

function createVotingWithCounts(
  counts: { J: number; N: number; E: number },
  majority: Pick<
    SessionScanItem,
    'majorityRequirement' | 'presentMembers'
  > = {},
): SessionScanItem {
  const votes: SessionScanVote[] = [
    ...Array.from({ length: counts.J }, (_, i) => ({
      name: `Ja ${i}`,
      vote: 'J' as const,
    })),
    ...Array.from({ length: counts.N }, (_, i) => ({
      name: `Nein ${i}`,
      vote: 'N' as const,
    })),
    ...Array.from({ length: counts.E }, (_, i) => ({
      name: `Enthaltung ${i}`,
      vote: 'E' as const,
    })),
  ];
  return { ...createVoting(votes), ...majority };
}

describe('votingAccepted with a majority requirement', () => {
  test.each([
    { J: 21, N: 20, E: 0, accepted: true },
    { J: 20, N: 20, E: 0, accepted: false },
    { J: 19, N: 20, E: 0, accepted: false },
  ])(
    'simple majority, explicitly set: $J:$N:$E -> $accepted',
    ({ accepted, ...counts }) => {
      const voting = createVotingWithCounts(counts, {
        majorityRequirement: 'simple',
      });

      expect(votingAccepted(voting, magdeburgLegalMemberCount)).toBe(accepted);
    },
  );

  test.each([
    { J: 21, N: 20, E: 0, accepted: true },
    { J: 20, N: 20, E: 0, accepted: false },
    { J: 19, N: 20, E: 0, accepted: false },
  ])(
    'simple majority, no requirement set: $J:$N:$E -> $accepted',
    ({ accepted, ...counts }) => {
      const voting = createVotingWithCounts(counts);

      expect(votingAccepted(voting, magdeburgLegalMemberCount)).toBe(accepted);
    },
  );

  test('simple majority ignores abstentions', () => {
    const voting = createVotingWithCounts({ J: 2, N: 1, E: 40 });

    expect(votingAccepted(voting, magdeburgLegalMemberCount)).toBe(true);
  });

  test('simple majority ignores a surplus presentMembers', () => {
    const voting = createVotingWithCounts(
      { J: 29, N: 16, E: 0 },
      { presentMembers: 56 },
    );

    expect(votingAccepted(voting, magdeburgLegalMemberCount)).toBe(true);
  });

  test.each([
    { J: 24, N: 22, E: 0, presentMembers: 46, accepted: true },
    { J: 23, N: 0, E: 0, presentMembers: 46, accepted: false },
    { J: 22, N: 0, E: 0, presentMembers: 46, accepted: false },
    { J: 23, N: 0, E: 0, presentMembers: 45, accepted: true },
  ])(
    'majority of present: $J yes of $presentMembers present -> $accepted',
    ({ accepted, presentMembers, ...counts }) => {
      const voting = createVotingWithCounts(counts, {
        majorityRequirement: 'majority-of-present',
        presentMembers,
      });

      expect(votingAccepted(voting, magdeburgLegalMemberCount)).toBe(accepted);
    },
  );

  test.each([
    { J: 31, N: 0, E: 0, presentMembers: 45, accepted: true },
    { J: 30, N: 0, E: 0, presentMembers: 45, accepted: true },
    { J: 29, N: 0, E: 0, presentMembers: 45, accepted: false },
  ])(
    'two thirds of present: $J yes of $presentMembers present -> $accepted',
    ({ accepted, presentMembers, ...counts }) => {
      const voting = createVotingWithCounts(counts, {
        majorityRequirement: 'two-thirds-of-present',
        presentMembers,
      });

      expect(votingAccepted(voting, magdeburgLegalMemberCount)).toBe(accepted);
    },
  );

  test.each([
    { requirement: 'majority-of-members', J: 30, accepted: true },
    { requirement: 'majority-of-members', J: 29, accepted: true },
    { requirement: 'majority-of-members', J: 28, accepted: false },
    { requirement: 'two-thirds-of-members', J: 39, accepted: true },
    { requirement: 'two-thirds-of-members', J: 38, accepted: true },
    { requirement: 'two-thirds-of-members', J: 37, accepted: false },
    { requirement: 'three-quarters-of-members', J: 44, accepted: true },
    { requirement: 'three-quarters-of-members', J: 43, accepted: true },
    { requirement: 'three-quarters-of-members', J: 42, accepted: false },
  ] as const)(
    '$requirement: $J yes -> $accepted',
    ({ requirement, J, accepted }) => {
      const voting = createVotingWithCounts(
        { J, N: 0, E: 0 },
        { majorityRequirement: requirement },
      );

      expect(votingAccepted(voting, magdeburgLegalMemberCount)).toBe(accepted);
    },
  );

  test.each([
    { requirement: 'majority-of-members', J: 21, accepted: true },
    { requirement: 'majority-of-members', J: 20, accepted: false },
    { requirement: 'two-thirds-of-members', J: 28, accepted: true },
    { requirement: 'two-thirds-of-members', J: 27, accepted: false },
    { requirement: 'three-quarters-of-members', J: 31, accepted: true },
    { requirement: 'three-quarters-of-members', J: 30, accepted: false },
  ] as const)(
    '$requirement in a council of 41 members: $J yes -> $accepted',
    ({ requirement, J, accepted }) => {
      const voting = createVotingWithCounts(
        { J, N: 0, E: 0 },
        { majorityRequirement: requirement },
      );

      expect(votingAccepted(voting, 41)).toBe(accepted);
    },
  );

  test.each([
    {
      name: 'Stadtschreiberstipendium 29:16:0, 46 present',
      J: 29,
      N: 16,
      E: 0,
      presentMembers: 46,
      accepted: false,
    },
    {
      name: 'Akteneinsicht 27:16:3, 46 present',
      J: 27,
      N: 16,
      E: 3,
      presentMembers: 46,
      accepted: false,
    },
    {
      name: 'Halberstädter Straße 24:14:4, 42 present',
      J: 24,
      N: 14,
      E: 4,
      presentMembers: 42,
      accepted: false,
    },
    {
      name: '37:0:1, 38 present',
      J: 37,
      N: 0,
      E: 1,
      presentMembers: 38,
      accepted: true,
    },
  ])(
    'two thirds of present, real case $name -> $accepted',
    ({ accepted, presentMembers, name: _, ...counts }) => {
      const voting = createVotingWithCounts(counts, {
        majorityRequirement: 'two-thirds-of-present',
        presentMembers,
      });

      expect(votingAccepted(voting, magdeburgLegalMemberCount)).toBe(accepted);
    },
  );
});
