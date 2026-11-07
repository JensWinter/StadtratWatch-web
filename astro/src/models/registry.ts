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
