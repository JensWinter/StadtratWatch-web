import type { Vote } from '../types';

// Subject classification types (voting-info <select> Typ).
export const VOTING_TYPES = [
  'Änderungsantrag',
  'Antrag',
  'Beschlussvorlage',
  'Delegation',
  'Geschäftsordnung',
  'Niederschrift',
  'Redaktionelle Änderung',
  'Sonstige',
  'Tagesordnung',
  'Widerspruch',
] as const;

// Author groups for voting-info. NOTE: abbreviated committee names — distinct
// from SPEECH_COMMITTEES (full names). They are NOT duplicates.
export const VOTING_COMMITTEES = [
  'Ausschuss BSS',
  'Ausschuss GeSo',
  'Ausschuss KRB',
  'Ausschuss StBV',
  'Ausschuss UwE',
  'Ausschuss WTR',
  'Betriebsausschuss KGM',
  'Betriebsausschuss KKM',
  'Betriebsausschuss PTH',
  'Betriebsausschuss SAB',
  'Betriebsausschuss SFM',
  'Finanz- und Grundstücksausschuss',
  'Jugendhilfeausschuss',
  'Kulturausschuss',
  'Theaterausschuss',
  'Verwaltungsausschuss',
] as const;

export const VOTING_DEPUTIES = [
  'Oberbürgermeisterin',
  'Dezernat für Personal, Bürgerservice und Ordnung',
  'Dezernat für Finanzen und Vermögen',
  'Dezernat für Wirtschaft, Tourismus und regionale Zusammenarbeit',
  'Dezernat für Kultur, Schule und Sport',
  'Dezernat für Soziales, Jugend und Gesundheit',
  'Dezernat für Umwelt und Stadtentwicklung',
] as const;

export const VOTING_TOWN_ADVISORY_COUNCILS = [
  'Ortschaftsrat Beyendorf-Sohlen',
  'Ortschaftsrat Pechau',
  'Ortschaftsrat Randau-Calenberge',
] as const;

// onBehalfOf radio list in speech-editor — full committee names.
export const SPEECH_COMMITTEES = [
  'Ausschuss für Bildung, Schule und Sport',
  'Ausschuss für Familie und Gleichstellung',
  'Ausschuss für kommunale Rechts- und Bürgerangelegenheiten',
  'Ausschuss für Rechnungsprüfung',
  'Ausschuss für Stadtentwicklung, Bauen und Verkehr',
  'Ausschuss für Umwelt und Energie',
  'Ausschuss für Wirtschaftsförderung, Tourismus und regionale Entwicklung',
  'Betriebsausschuss Stadtgarten und Friedhöfe Magdeburg',
  'Finanz- und Grundstücksausschuss',
  'Gesundheits- und Sozialausschuss',
  'Jugendhilfeausschuss',
  'Kulturausschuss',
  'Ortschaftsrat Beyendorf-Sohlen',
  'Ortschaftsrat Pechau',
  'Ortschaftsrat Randau-Calenberge',
  'Theaterausschuss',
  'Unterausschuss Jugendhilfeplanung',
  'Vergabeausschuss',
] as const;

export const CHAIR_PERSONS = [
  'Bernd Heynemann',
  'Wigbert Schwenke',
  'Dr. Norman Belas',
  'Stephan Bublitz',
] as const;

export function voteColor(vote: Vote): string {
  if (vote === 'J') return 'green';
  if (vote === 'N') return 'red';
  if (vote === 'E') return 'yellow';
  return 'white';
}
