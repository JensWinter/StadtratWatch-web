import type { Registry } from './registry.ts';
import type { SessionScanItem, SessionScanVote } from './session-scan.ts';
import { VoteResult } from './Session.ts';

export type VotesByFaction = {
  factionId: string;
  factionName: string;
  orderIndex: number;
  votes: { personName: string; vote: string }[];
};

// Keyed by the vote codes the scans carry (VoteResult), which the web assets expose as-is.
export type VoteCounts = {
  [VoteResult.VOTE_FOR]: number;
  [VoteResult.VOTE_AGAINST]: number;
  [VoteResult.VOTE_ABSTENTION]: number;
  [VoteResult.DID_NOT_VOTE]: number;
};

const votePresentationOrder = new Map<string, number>([
  [VoteResult.VOTE_FOR, 1],
  [VoteResult.VOTE_AGAINST, 2],
  [VoteResult.VOTE_ABSTENTION, 3],
  [VoteResult.DID_NOT_VOTE, 4],
]);

function getVotePresentationOrder(vote: string): number {
  return (
    votePresentationOrder.get(vote) ??
    votePresentationOrder.get(VoteResult.DID_NOT_VOTE)!
  );
}

// The scan filename carries the voting id, e.g. 2024-07-08-014.png -> 14.
const votingIdRange = { start: 11, end: 14 };

export function getVotingId(voting: SessionScanItem): number {
  return +voting.votingFilename.substring(
    votingIdRange.start,
    votingIdRange.end,
  );
}

export function getVoteCounts(voting: SessionScanItem): VoteCounts {
  const counts: VoteCounts = {
    [VoteResult.VOTE_FOR]: 0,
    [VoteResult.VOTE_AGAINST]: 0,
    [VoteResult.VOTE_ABSTENTION]: 0,
    [VoteResult.DID_NOT_VOTE]: 0,
  };

  for (const vote of voting.votes) {
    const countedVote = isCountedVoteResult(vote.vote)
      ? vote.vote
      : VoteResult.DID_NOT_VOTE;
    counts[countedVote]++;
  }

  return counts;
}

function isCountedVoteResult(vote: string): vote is keyof VoteCounts {
  return (
    vote === VoteResult.VOTE_FOR ||
    vote === VoteResult.VOTE_AGAINST ||
    vote === VoteResult.VOTE_ABSTENTION ||
    vote === VoteResult.DID_NOT_VOTE
  );
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
            getVotePresentationOrder(a.vote) - getVotePresentationOrder(b.vote),
        )
        .map((vote) => ({
          personName: vote.personName,
          vote: vote.vote,
        })),
    }));
}

export function votingAccepted(voting: SessionScanItem): boolean {
  const counts = getVoteCounts(voting);
  return counts[VoteResult.VOTE_FOR] > counts[VoteResult.VOTE_AGAINST];
}
