import type { Registry } from './registry.ts';
import type { SessionScanItem, SessionScanVote } from './session-scan.ts';
import { VoteResult } from './Session.ts';

export type VotesByFaction = {
  factionId: string;
  factionName: string;
  orderIndex: number;
  votes: { personName: string; vote: string }[];
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

function countVotes(votes: SessionScanVote[], voteResult: VoteResult): number {
  return votes.filter((vote) => vote.vote === voteResult).length;
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
  const votedFor = countVotes(voting.votes, VoteResult.VOTE_FOR);
  const votedAgainst = countVotes(voting.votes, VoteResult.VOTE_AGAINST);
  return votedFor > votedAgainst;
}
