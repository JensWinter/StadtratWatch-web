import type { Registry } from './registry.ts';
import type { SessionScanItem, SessionScanVote } from './session-scan.ts';
import type { VoteCode } from './Session.ts';

export type VotesByFaction = {
  factionId: string;
  factionName: string;
  orderIndex: number;
  votes: { personName: string; vote: VoteCode }[];
};

// Keyed by the vote codes the scans carry, which the web assets expose as-is.
export type VoteCounts = Record<VoteCode, number>;

const votePresentationOrder: Record<VoteCode, number> = {
  J: 1,
  N: 2,
  E: 3,
  O: 4,
};

// The scan filename carries the voting id, e.g. 2024-07-08-014.png -> 14.
const votingIdRange = { start: 11, end: 14 };

export function getVotingId(voting: SessionScanItem): number {
  return +voting.votingFilename.substring(
    votingIdRange.start,
    votingIdRange.end,
  );
}

export function getVoteCounts(voting: SessionScanItem): VoteCounts {
  const counts: VoteCounts = { J: 0, N: 0, E: 0, O: 0 };

  for (const vote of voting.votes) {
    counts[vote.vote]++;
  }

  return counts;
}

export function getVotesByFactions(
  parliamentPeriod: Registry,
  votes: SessionScanVote[],
): VotesByFaction[] {
  const personsByName = new Map(
    parliamentPeriod.persons.map((person) => [person.name, person]),
  );

  const votesWithFactionId = votes.map((vote) => {
    const person = personsByName.get(vote.name);
    if (!person) {
      throw new Error(`Person ${vote.name} not found`);
    }
    return {
      personName: person.name,
      factionId: person.factionId,
      vote: vote.vote,
    };
  });

  return parliamentPeriod.factions
    .toSorted((a, b) => b.seats - a.seats)
    .map((faction, orderIndex) => ({
      factionId: faction.id,
      factionName: faction.name,
      orderIndex,
      votes: votesWithFactionId
        .filter((vote) => vote.factionId === faction.id)
        .toSorted(
          (a, b) =>
            votePresentationOrder[a.vote] - votePresentationOrder[b.vote],
        )
        .map((vote) => ({
          personName: vote.personName,
          vote: vote.vote,
        })),
    }));
}

export function votingAccepted(
  parliamentPeriod: Registry,
  voting: SessionScanItem,
): boolean {
  const { J: yes, N: no } = getVoteCounts(voting);
  const statutoryMemberCount = getStatutoryMemberCount(parliamentPeriod);

  switch (voting.majorityRequirement) {
    case 'majority-of-present':
      return 2 * yes > requirePresentMembers(voting);
    case 'two-thirds-of-present':
      return 3 * yes >= 2 * requirePresentMembers(voting);
    case 'majority-of-members':
      return 2 * yes > statutoryMemberCount;
    case 'two-thirds-of-members':
      return 3 * yes >= 2 * statutoryMemberCount;
    case 'three-quarters-of-members':
      return 4 * yes >= 3 * statutoryMemberCount;
    case 'simple':
    case undefined:
      return yes > no;
  }
}

function getStatutoryMemberCount(parliamentPeriod: Registry): number {
  return parliamentPeriod.factions.reduce(
    (memberCount, faction) => memberCount + faction.seats,
    0,
  );
}

function requirePresentMembers(voting: SessionScanItem): number {
  if (voting.presentMembers === undefined) {
    throw new Error(
      `${voting.votingFilename}: ${voting.majorityRequirement} needs presentMembers`,
    );
  }
  return voting.presentMembers;
}
