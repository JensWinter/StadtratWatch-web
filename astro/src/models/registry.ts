export type Registry = {
  id: string;
  name: string;
  lastUpdate: string;
  sessions: RegistrySession[];
  factions: RegistryFaction[];
  parties: RegistryParty[];
  persons: RegistryPerson[];
};

export type RegistrySession = {
  id: string;
  date: string;
  title: string;
  youtubeUrl: string;
  meetingMinutesUrl: string | null;
  approved: boolean;
};

export type RegistryFaction = {
  id: string;
  name: string;
  seats: number;
};

export type RegistryParty = {
  id: string;
  name: string;
  seats: number;
  additionalInformation?: { key: string; value: string }[];
};

export type RegistryPerson = {
  id: string;
  name: string;
  factionId: string;
  partyId: string;
  start: string | null;
  end: string | null;
};

// The Gesetzliche Mitgliederzahl. The Oberbürgermeisterin is a faction of one,
// and seats stay fixed for the period, so a vacant seat does not lower it.
export function getLegalMemberCount(registry: Registry): number {
  return sumSeats(registry.factions);
}

// Faction and party seats both cover the whole council, so a different sum
// means a seat count in registry.json is wrong.
export function findSeatCountMismatch(registry: Registry): string | undefined {
  const factionSeats = sumSeats(registry.factions);
  const partySeats = sumSeats(registry.parties);
  if (factionSeats === 0) {
    return `faction seats add up to 0`;
  }
  if (factionSeats !== partySeats) {
    return `faction seats add up to ${factionSeats}, party seats to ${partySeats}`;
  }
  return undefined;
}

function sumSeats(groups: { seats: number }[]): number {
  return groups.reduce((total, group) => total + group.seats, 0);
}
