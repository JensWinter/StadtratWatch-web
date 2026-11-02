import type { SessionInput } from '@models/SessionInput.ts';
import type {
  Registry,
  RegistryFaction,
  RegistryParty,
  RegistryPerson,
} from '@models/registry.ts';
import type { SessionScanItem } from '@models/session-scan.ts';
import {
  getPersonsOfSessionAndFaction,
  getPersonsOfSessionAndParty,
  isPersonInSession,
} from '@utils/session-utils.ts';

export type HistoryDataPoint = {
  date: string;
  value: number;
};

export function calcAbstentionRateOfFaction(
  parliamentPeriod: Registry,
  faction: RegistryFaction,
  sessions: SessionInput[],
): number | null {
  const abstentionRates = sessions
    .flatMap((session) => {
      const persons = getPersonsOfSessionAndFaction(
        parliamentPeriod,
        session.session,
        faction,
      ).map((person) => person.name);
      return session.votings.map((voting) =>
        calcAbstentionRate(persons, voting),
      );
    })
    .filter((rate) => rate !== null)
    .map((rate) => rate!);

  return abstentionRates.length === 0
    ? null
    : abstentionRates.reduce((a, b) => a + b, 0) / abstentionRates.length;
}

export function calcAbstentionRateHistoryOfFaction(
  parliamentPeriod: Registry,
  faction: RegistryFaction,
  sessions: SessionInput[],
): HistoryDataPoint[] {
  return sessions
    .map((session) => {
      const pastSessions = sessions.filter(
        (s) => s.session.date <= session.session.date,
      );
      const value = calcAbstentionRateOfFaction(
        parliamentPeriod,
        faction,
        pastSessions,
      );
      return { date: session.session.date, value };
    })
    .filter((obj): obj is HistoryDataPoint => obj.value !== null)
    .toSorted((a, b) => a.date.localeCompare(b.date));
}

export function calcAbstentionRateOfParty(
  parliamentPeriod: Registry,
  party: RegistryParty,
  sessions: SessionInput[],
): number | null {
  const abstentionRates = sessions
    .flatMap((session) => {
      const persons = getPersonsOfSessionAndParty(
        parliamentPeriod,
        session.session,
        party,
      ).map((person) => person.name);
      return session.votings.map((voting) =>
        calcAbstentionRate(persons, voting),
      );
    })
    .filter((rate) => rate !== null)
    .map((rate) => rate!);

  return abstentionRates.length === 0
    ? null
    : abstentionRates.reduce((a, b) => a + b, 0) / abstentionRates.length;
}

export function calcAbstentionRateHistoryOfParty(
  parliamentPeriod: Registry,
  party: RegistryParty,
  sessions: SessionInput[],
): HistoryDataPoint[] {
  return sessions
    .map((session) => {
      const pastSessions = sessions.filter(
        (s) => s.session.date <= session.session.date,
      );
      const value = calcAbstentionRateOfParty(
        parliamentPeriod,
        party,
        pastSessions,
      );
      return { date: session.session.date, value };
    })
    .filter((obj): obj is HistoryDataPoint => obj.value !== null)
    .toSorted((a, b) => a.date.localeCompare(b.date));
}

export function calcAbstentionRateOfPerson(
  person: RegistryPerson,
  sessions: SessionInput[],
): number | null {
  const abstentionRates = sessions
    .filter((session) => isPersonInSession(person, session.session))
    .flatMap((session) => session.votings)
    .filter((voting) =>
      voting.votes.some(
        (vote) => vote.name === person.name && vote.vote !== 'O',
      ),
    )
    .map((voting) => calcAbstentionRate([person.name], voting))
    .filter((rate) => rate !== null)
    .map((rate) => rate!);

  return abstentionRates.length === 0
    ? null
    : abstentionRates.reduce((a, b) => a + b, 0) / abstentionRates.length;
}

export function calcAbstentionRateHistoryOfPerson(
  person: RegistryPerson,
  sessions: SessionInput[],
): HistoryDataPoint[] {
  return sessions
    .map((session) => {
      const pastSessions = sessions.filter(
        (s) => s.session.date <= session.session.date,
      );
      const value = calcAbstentionRateOfPerson(person, pastSessions);
      return { date: session.session.date, value };
    })
    .filter((obj): obj is HistoryDataPoint => obj.value !== null)
    .toSorted((a, b) => a.date.localeCompare(b.date));
}

function calcAbstentionRate(
  persons: string[],
  voting: SessionScanItem,
): number | null {
  const allVotes = voting.votes
    .filter((vote) => persons.includes(vote.name))
    .filter((vote) => vote.vote !== 'O');
  const abstentions = allVotes.filter((vote) => vote.vote === 'E').length;
  return allVotes.length === 0 ? null : abstentions / allVotes.length;
}
