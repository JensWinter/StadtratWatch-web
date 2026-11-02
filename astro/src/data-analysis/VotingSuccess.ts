import type { SessionInput } from '@models/SessionInput.ts';
import type {
  Registry,
  RegistryFaction,
  RegistryParty,
  RegistryPerson,
} from '@models/registry.ts';
import type { SessionScanItem } from '@models/session-scan.ts';
import type { VotingResult } from '@models/Session.ts';
import {
  getPersonsOfSessionAndFaction,
  getPersonsOfSessionAndParty,
  isPersonInSession,
} from '@utils/session-utils.ts';

export type HistoryDataPoint = {
  date: string;
  value: number;
};

export function calcVotingSuccessRateOfFaction(
  parliamentPeriod: Registry,
  faction: RegistryFaction,
  sessions: SessionInput[],
): number | null {
  const votingsSuccess = sessions
    .flatMap((session) => {
      const persons = getPersonsOfSessionAndFaction(
        parliamentPeriod,
        session.session,
        faction,
      ).map((name) => name.name);
      const successfulVotings = session.votings.filter((voting) =>
        isPersonsVotingSuccessful(persons, voting),
      );
      return {
        successfulVotings: successfulVotings.length,
        totalVotings: session.votings.length,
      };
    })
    .reduce((acc, { successfulVotings, totalVotings }) => ({
      successfulVotings: acc.successfulVotings + successfulVotings,
      totalVotings: acc.totalVotings + totalVotings,
    }));

  return votingsSuccess.totalVotings === 0
    ? null
    : votingsSuccess.successfulVotings / votingsSuccess.totalVotings;
}

export function calcVotingSuccessRateHistoryOfFaction(
  parliamentPeriod: Registry,
  faction: RegistryFaction,
  sessions: SessionInput[],
): HistoryDataPoint[] {
  return sessions
    .map((session) => {
      const pastSessions = sessions.filter(
        (s) => s.session.date <= session.session.date,
      );
      const value = calcVotingSuccessRateOfFaction(
        parliamentPeriod,
        faction,
        pastSessions,
      );
      return { date: session.session.date, value };
    })
    .filter((obj): obj is HistoryDataPoint => obj.value !== null)
    .toSorted((a, b) => a.date.localeCompare(b.date));
}

export function calcVotingSuccessRateOfParty(
  parliamentPeriod: Registry,
  party: RegistryParty,
  sessions: SessionInput[],
): number | null {
  const votingsSuccess = sessions
    .flatMap((session) => {
      const persons = getPersonsOfSessionAndParty(
        parliamentPeriod,
        session.session,
        party,
      ).map((name) => name.name);
      const successfulVotings = session.votings.filter((voting) =>
        isPersonsVotingSuccessful(persons, voting),
      );
      return {
        successfulVotings: successfulVotings.length,
        totalVotings: session.votings.length,
      };
    })
    .reduce((acc, { successfulVotings, totalVotings }) => ({
      successfulVotings: acc.successfulVotings + successfulVotings,
      totalVotings: acc.totalVotings + totalVotings,
    }));

  return votingsSuccess.totalVotings === 0
    ? null
    : votingsSuccess.successfulVotings / votingsSuccess.totalVotings;
}

export function calcVotingSuccessRateHistoryOfParty(
  parliamentPeriod: Registry,
  party: RegistryParty,
  sessions: SessionInput[],
): HistoryDataPoint[] {
  return sessions
    .map((session) => {
      const pastSessions = sessions.filter(
        (s) => s.session.date <= session.session.date,
      );
      const value = calcVotingSuccessRateOfParty(
        parliamentPeriod,
        party,
        pastSessions,
      );
      return { date: session.session.date, value };
    })
    .filter((obj): obj is HistoryDataPoint => obj.value !== null)
    .toSorted((a, b) => a.date.localeCompare(b.date));
}

export function calcVotingSuccessRateOfPerson(
  person: RegistryPerson,
  sessions: SessionInput[],
): number | null {
  const votingSuccess = sessions
    .filter((session) => isPersonInSession(person, session.session))
    .flatMap((session) => session.votings)
    .filter((voting) =>
      // TODO: To be decided => Different results if the abstentions are counted as success or not
      //  or if the they are not counted at all
      voting.votes.some(
        (vote) => vote.name === person.name && vote.vote !== 'O',
      ),
    )
    .map((voting) => {
      const personVote = voting.votes.find(
        (vote) => vote.name === person.name,
      )!.vote;
      const votingResult = getVotingResult(voting);
      return (
        (personVote === 'J' && votingResult === 'PASSED') ||
        (personVote === 'N' && votingResult === 'REJECTED')
      );
    });

  const successCount = votingSuccess.filter(Boolean).length;

  return votingSuccess.length === 0
    ? null
    : successCount / votingSuccess.length;
}

export function calcVotingSuccessRateHistoryOfPerson(
  person: RegistryPerson,
  sessions: SessionInput[],
): HistoryDataPoint[] {
  return sessions
    .map((session) => {
      const pastSessions = sessions.filter(
        (s) => s.session.date <= session.session.date,
      );
      const value = calcVotingSuccessRateOfPerson(person, pastSessions);
      return { date: session.session.date, value };
    })
    .filter((obj): obj is HistoryDataPoint => obj.value !== null)
    .toSorted((a, b) => a.date.localeCompare(b.date));
}

function isPersonsVotingSuccessful(
  persons: string[],
  voting: SessionScanItem,
): boolean {
  const votingResult = getVotingResult(voting);
  const personsVotingResult = calcPersonsVotingResult(persons, voting);

  return votingResult === personsVotingResult;
}

function calcPersonsVotingResult(
  persons: string[],
  voting: SessionScanItem,
): VotingResult | null {
  const personsVotes = voting.votes.filter(
    (vote) => persons.includes(vote.name) && vote.vote !== 'O',
  );
  const votedFor = personsVotes.filter((vote) => vote.vote === 'J').length;
  const votedAgainst = personsVotes.filter((vote) => vote.vote === 'N').length;

  if (personsVotes.length === 0) {
    return null;
  }

  return votedFor > votedAgainst ? 'PASSED' : 'REJECTED';
}

function getVotingResult(voting: SessionScanItem): VotingResult {
  const votedFor = voting.votes.filter((vote) => vote.vote === 'J').length;
  const votedAgainst = voting.votes.filter((vote) => vote.vote === 'N').length;
  return votedFor > votedAgainst ? 'PASSED' : 'REJECTED';
}
