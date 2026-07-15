import type {
  Registry,
  RegistryFaction,
  RegistryParty,
  RegistryPerson,
  RegistrySession,
} from '@models/registry.ts';
import type { SessionScanItem } from '@models/session-scan.ts';

function getPersonsOfSession(
  parliamentPeriod: Registry,
  session: RegistrySession,
): RegistryPerson[] {
  return parliamentPeriod.persons.filter((person) =>
    isPersonInSession(person, session),
  );
}

export function getPersonsOfSessionAndParty(
  parliamentPeriod: Registry,
  session: RegistrySession,
  party: RegistryParty,
): RegistryPerson[] {
  return getPersonsOfSession(parliamentPeriod, session).filter(
    (person) => person.partyId === party.id,
  );
}

export function getPersonsOfSessionAndFaction(
  parliamentPeriod: Registry,
  session: RegistrySession,
  faction: RegistryFaction,
): RegistryPerson[] {
  return getPersonsOfSession(parliamentPeriod, session).filter(
    (person) => person.factionId === faction.id,
  );
}

export function isPersonInSession(
  person: RegistryPerson,
  session: RegistrySession,
): boolean {
  const sessionDate = session.date;
  return (
    (person.start === null || person.start <= sessionDate) &&
    (person.end === null || person.end >= sessionDate)
  );
}

export function getPersonByName(
  parliamentPeriod: Registry,
  session: RegistrySession,
  personName: string,
): RegistryPerson | null {
  return (
    getPersonsOfSession(parliamentPeriod, session).find(
      (person) => person.name === personName,
    ) || null
  );
}

export function getFactionOfPerson(
  parliamentPeriod: Registry,
  session: RegistrySession,
  person: RegistryPerson,
): RegistryFaction | null {
  return (
    parliamentPeriod.factions.find(
      (faction) =>
        faction.id === person.factionId && isPersonInSession(person, session),
    ) || null
  );
}

export function getVideoTimestampAsSeconds(voting: SessionScanItem): number {
  const timeParts = voting.videoTimestamp.split(':');
  switch (timeParts.length) {
    case 1:
      return Number.parseInt(timeParts[0] || '0');
    case 2:
      return (
        Number.parseInt(timeParts[0] || '0') * 60 +
        Number.parseInt(timeParts[1] || '0')
      );
    case 3:
      return (
        Number.parseInt(timeParts[0] || '0') * 3600 +
        Number.parseInt(timeParts[1] || '0') * 60 +
        Number.parseInt(timeParts[2] || '0')
      );
    default:
      return 0;
  }
}
