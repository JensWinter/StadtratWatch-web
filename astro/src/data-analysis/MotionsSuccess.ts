import type { SessionInput } from '@models/SessionInput.ts';
import type { Registry, RegistryFaction } from '@models/registry.ts';
import type { SessionScanItem } from '@models/session-scan.ts';
import { votingAccepted } from '@models/voting-breakdown.ts';

export type HistoryDataPoint = {
  date: string;
  value: number;
};

export function calcMotionsSuccessRateOfFaction(
  parliamentPeriod: Registry,
  faction: RegistryFaction,
  sessions: SessionInput[],
): number | null {
  const votings = sessions
    .flatMap((session) => session.votings)
    .filter((voting) => voting.votingSubject.authors.includes(faction.name));

  // Group votings to take item-by-item votings into account
  const groupedVotings = Object.groupBy(votings, (voting: SessionScanItem) => {
    const { votingSubject } = voting;
    const { agendaItem, motionId, type } = votingSubject;
    return `${agendaItem}|${motionId}|${type}`;
  });

  const votingGroupsResults = Array.from(Object.values(groupedVotings))
    .map((votings) => votings!)
    .map((votings) => {
      const votingsAccepted = votings.filter((voting) =>
        votingAccepted(parliamentPeriod, voting),
      );
      return votingsAccepted.length / votings.length;
    });

  return votingGroupsResults.length === 0
    ? null
    : votingGroupsResults.reduce((acc, curr) => acc + curr, 0) /
        votingGroupsResults.length;
}

export function calcMotionsSuccessRateHistoryOfFaction(
  parliamentPeriod: Registry,
  faction: RegistryFaction,
  sessions: SessionInput[],
): HistoryDataPoint[] {
  return sessions
    .map((session) => {
      const pastSessions = sessions.filter(
        (s) => s.session.date <= session.session.date,
      );
      const value = calcMotionsSuccessRateOfFaction(
        parliamentPeriod,
        faction,
        pastSessions,
      );
      return { date: session.session.date, value };
    })
    .filter((obj): obj is HistoryDataPoint => obj.value !== null)
    .toSorted((a, b) => a.date.localeCompare(b.date));
}
