import { describe, expect, test } from 'vitest';
import {
  getVoteCounts,
  getVotesByFactions,
  getVotingId,
  votingAccepted,
} from './voting-breakdown.ts';
import type { Registry } from './registry.ts';
import type { SessionScanItem, SessionScanVote } from './session-scan.ts';
import type { VoteCode } from './Session.ts';

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

// Faction seats add up to the statutory member count; the Oberbürgermeisterin holds one.
function createCouncilWithSeats(seatsPerFaction: number[]): Registry {
  return {
    ...createRegistry(),
    factions: seatsPerFaction.map((seats, index) => ({
      id: `faction-${index}`,
      name: `Faction ${index}`,
      seats,
    })),
  };
}

const magdeburgCouncil = createCouncilWithSeats([15, 13, 10, 6, 6, 3, 3, 1]);

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

    expect(votingAccepted(magdeburgCouncil, voting)).toBe(true);
  });

  test('rejects a voting with a tie', () => {
    const voting = createVoting([
      { name: 'Supporter', vote: 'J' },
      { name: 'Opposer', vote: 'N' },
    ]);

    expect(votingAccepted(magdeburgCouncil, voting)).toBe(false);
  });

  test('rejects a voting with more no than yes votes', () => {
    const voting = createVoting([
      { name: 'Opposer', vote: 'N' },
      { name: 'Lone Voter', vote: 'N' },
      { name: 'Supporter', vote: 'J' },
    ]);

    expect(votingAccepted(magdeburgCouncil, voting)).toBe(false);
  });

  test('ignores abstentions and non-votes when comparing', () => {
    const voting = createVoting([
      { name: 'Supporter', vote: 'J' },
      { name: 'Abstainer', vote: 'E' },
      { name: 'Absentee', vote: 'O' },
    ]);

    expect(votingAccepted(magdeburgCouncil, voting)).toBe(true);
  });
});

function createVotingWithCounts(
  { yes, no, abstain }: { yes: number; no: number; abstain: number },
  majorityFields: Pick<
    SessionScanItem,
    'majorityRequirement' | 'presentMembers'
  > = {},
): SessionScanItem {
  const votesOf = (count: number, vote: VoteCode) =>
    Array.from({ length: count }, (_, index) => ({
      name: `${vote}-${index}`,
      vote,
    }));

  return {
    ...createVoting([
      ...votesOf(yes, 'J'),
      ...votesOf(no, 'N'),
      ...votesOf(abstain, 'E'),
    ]),
    ...majorityFields,
  };
}

describe('votingAccepted with a majority requirement', () => {
  test('rejects 29:16:0 needing two thirds of 46 present members', () => {
    const voting = createVotingWithCounts(
      { yes: 29, no: 16, abstain: 0 },
      { majorityRequirement: 'two-thirds-of-present', presentMembers: 46 },
    );

    expect(votingAccepted(magdeburgCouncil, voting)).toBe(false);
  });
});

describe('votingAccepted with two thirds of present members', () => {
  test.each([
    { yes: 31, presentMembers: 45, accepted: true },
    { yes: 30, presentMembers: 45, accepted: true },
    { yes: 29, presentMembers: 45, accepted: false },
    { yes: 31, presentMembers: 46, accepted: true },
    { yes: 30, presentMembers: 46, accepted: false },
  ])(
    '$yes yes of $presentMembers present members: accepted $accepted',
    ({ yes, presentMembers, accepted }) => {
      const voting = createVotingWithCounts(
        { yes, no: 0, abstain: 0 },
        { majorityRequirement: 'two-thirds-of-present', presentMembers },
      );

      expect(votingAccepted(magdeburgCouncil, voting)).toBe(accepted);
    },
  );
});

describe('votingAccepted with the majority of present members', () => {
  test.each([
    { yes: 24, presentMembers: 46, accepted: true },
    { yes: 23, presentMembers: 46, accepted: false },
    { yes: 22, presentMembers: 46, accepted: false },
    { yes: 23, presentMembers: 45, accepted: true },
    { yes: 22, presentMembers: 45, accepted: false },
  ])(
    '$yes yes of $presentMembers present members: accepted $accepted',
    ({ yes, presentMembers, accepted }) => {
      const voting = createVotingWithCounts(
        { yes, no: 20, abstain: 0 },
        { majorityRequirement: 'majority-of-present', presentMembers },
      );

      expect(votingAccepted(magdeburgCouncil, voting)).toBe(accepted);
    },
  );
});

describe('votingAccepted with a requirement measured against the statutory member count', () => {
  test.each([
    { majorityRequirement: 'majority-of-members', yes: 30, accepted: true },
    { majorityRequirement: 'majority-of-members', yes: 29, accepted: true },
    { majorityRequirement: 'majority-of-members', yes: 28, accepted: false },
    { majorityRequirement: 'two-thirds-of-members', yes: 39, accepted: true },
    { majorityRequirement: 'two-thirds-of-members', yes: 38, accepted: true },
    { majorityRequirement: 'two-thirds-of-members', yes: 37, accepted: false },
    {
      majorityRequirement: 'three-quarters-of-members',
      yes: 44,
      accepted: true,
    },
    {
      majorityRequirement: 'three-quarters-of-members',
      yes: 43,
      accepted: true,
    },
    {
      majorityRequirement: 'three-quarters-of-members',
      yes: 42,
      accepted: false,
    },
  ] as const)(
    '$majorityRequirement with $yes yes votes: accepted $accepted',
    ({ majorityRequirement, yes, accepted }) => {
      const voting = createVotingWithCounts(
        { yes, no: 0, abstain: 0 },
        { majorityRequirement },
      );

      expect(votingAccepted(magdeburgCouncil, voting)).toBe(accepted);
    },
  );
});

describe('votingAccepted statutory member count', () => {
  test('is the sum of the faction seats of the parliament period', () => {
    const councilOf60Seats = createCouncilWithSeats([30, 29, 1]);
    const voting = createVotingWithCounts(
      { yes: 30, no: 0, abstain: 0 },
      { majorityRequirement: 'majority-of-members' },
    );

    expect(votingAccepted(councilOf60Seats, voting)).toBe(false);
  });
});

describe('votingAccepted with the simple majority', () => {
  test.each([
    { majorityRequirement: undefined, yes: 21, no: 20, accepted: true },
    { majorityRequirement: undefined, yes: 20, no: 20, accepted: false },
    { majorityRequirement: undefined, yes: 19, no: 20, accepted: false },
    { majorityRequirement: 'simple', yes: 21, no: 20, accepted: true },
    { majorityRequirement: 'simple', yes: 20, no: 20, accepted: false },
    { majorityRequirement: 'simple', yes: 19, no: 20, accepted: false },
  ] as const)(
    '$majorityRequirement with $yes:$no: accepted $accepted',
    ({ majorityRequirement, yes, no, accepted }) => {
      const voting = createVotingWithCounts(
        { yes, no, abstain: 0 },
        { majorityRequirement },
      );

      expect(votingAccepted(magdeburgCouncil, voting)).toBe(accepted);
    },
  );

  test('ignores abstentions', () => {
    const voting = createVotingWithCounts(
      { yes: 10, no: 9, abstain: 30 },
      { majorityRequirement: 'simple' },
    );

    expect(votingAccepted(magdeburgCouncil, voting)).toBe(true);
  });

  test('ignores present members it does not need', () => {
    const voting = createVotingWithCounts(
      { yes: 29, no: 16, abstain: 0 },
      { majorityRequirement: 'simple', presentMembers: 46 },
    );

    expect(votingAccepted(magdeburgCouncil, voting)).toBe(true);
  });
});

describe('votingAccepted for real votings needing two thirds of present members', () => {
  test.each([
    { yes: 29, no: 16, abstain: 0, presentMembers: 46, accepted: false },
    { yes: 27, no: 16, abstain: 3, presentMembers: 46, accepted: false },
    { yes: 24, no: 14, abstain: 4, presentMembers: 42, accepted: false },
    { yes: 37, no: 0, abstain: 1, presentMembers: 38, accepted: true },
  ])(
    '$yes:$no:$abstain with $presentMembers present members: accepted $accepted',
    ({ yes, no, abstain, presentMembers, accepted }) => {
      const voting = createVotingWithCounts(
        { yes, no, abstain },
        { majorityRequirement: 'two-thirds-of-present', presentMembers },
      );

      expect(votingAccepted(magdeburgCouncil, voting)).toBe(accepted);
    },
  );
});
