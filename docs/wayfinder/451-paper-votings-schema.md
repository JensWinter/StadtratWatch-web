# Schema & Aufbau des paper-votings-Assets (Reverse-Lookup)

Ticket: [#451](https://github.com/JensWinter/StadtratWatch-web/issues/451) · Map: [#448](https://github.com/JensWinter/StadtratWatch-web/issues/448)

Baut auf: Architektur [#449](https://github.com/JensWinter/StadtratWatch-web/issues/449) (eigenes CloudFront-Asset, self-contained, lazy) und Cross-Period [#450](https://github.com/JensWinter/StadtratWatch-web/issues/450) (Drucksache kann Abstimmungen in mehreren Wahlperioden haben).

## Kurzfassung

Ein neuer Deno-Generator präkompiliert je Drucksache alle **tatsächlich gescannten** Abstimmungen — self-contained inkl. Fraktions-/Personen-Aufschlüsselung — und schreibt sie in Batch-Dateien auf CloudFront. Die Drucksachenseite lädt lazy genau die eine Batch-Datei ihrer paperId und rendert daraus den Tab »Abstimmungen« ohne weitere Fetches.

## Getroffene Entscheidungen (Grilling)

1. **Mehrfach-Scans pro (Session, agendaItem):** kommen real und häufig vor (z.B. paperId `243686`, agendaItem `12.6` am 2024-07-08 → Scans `012` und `014`). ⇒ **Alle** als eigene Abstimmungszeilen (eigene votingId/Ergebnis/Aufschlüsselung). Nichts wird dedupliziert.
2. **`type`-Feld:** wird mitgeführt (billig, self-contained), **aber kein »Nur Sachbeschlüsse«-Filter** auf dem Tab. Auf einer Drucksache sind es ohnehin wenige Abstimmungen; `type` steht für spätere Badges/Anzeige bereit, ohne Generator-Rebuild.
3. **Ergebnis:** **vorberechnet** — `accepted` (= `J > N`, identisch zu `votingAccepted` der Sitzungsseite) **und** Zähler `{ J, N, E, O }`. Client rendert direkt.
4. **Sortierung:** der **Generator** liefert das Array je Drucksache fertig sortiert — `sessionDate` **absteigend** (neueste zuerst), bei Gleichstand `votingId` **aufsteigend** (chronologische Lesereihenfolge innerhalb der Sitzung). Client rendert nur.

## Join / Reverse-Lookup

Verknüpfung Abstimmung→Drucksache existiert heute nur vorwärts in `data/{period}/voting-paper-map.json` = `{ sessionDate: { agendaItem: paperId } }`. Der Generator dreht sie um:

- **Join-Schlüssel:** exakter String-Vergleich auf `agendaItem` zwischen `voting-paper-map[sessionDate][agendaItem]` und `session-scan`-Items (`votingSubject.agendaItem`).
- **Schnitt map × session-scan:** `voting-paper-map` enthält *alle* TOP mit OParl-Consultation→Paper, auch **ohne** gescannte Abstimmung (z.B. Map-Keys `13.1–13.6` am 2024-07-08 haben kein Scan-Item). Nur Abstimmungen mit vorhandenem Scan-Item zählen. Drucksachen ohne Schnitt erscheinen gar nicht im Asset ⇒ Tab »Abstimmungen« ist automatisch **deaktiviert, wenn leer**.
- **Mehrere Scans je agendaItem:** alle Treffer werden zu je einer Abstimmungszeile (Entscheidung 1).
- **Cross-Period (#450):** alle Perioden-Maps werden gescannt; Treffer je paperId werden zusammengeführt. Jede Zeile trägt `parliamentPeriodId`; `votesByFactions` wird gegen die `registry.json` der **jeweiligen** Periode gejoint. Paper-IDs sind global eindeutig (keine Kollision).
- **votingId:** `+votingFilename.substring(11, 14)` (z.B. `2024-07-08-012.png` → `12`) — laufender Index innerhalb der Sitzung, wie `getVotingId` in `astro/src/utils/session-utils.ts`.

## Schema

Batch-Datei `web-assets/paper-votings/paper-votings-{batch}.json` ist ein **JSON-Array** (analog `papers-{batch}.json`, das der Client per `batch.find(...)` durchsucht):

```ts
// paper-votings-{batch}.json  ==  PaperVotingsDto[]

type PaperVotingsDto = {
  paperId: number;
  votings: PaperVotingItem[]; // vorsortiert: sessionDate desc, dann votingId asc
};

type PaperVotingItem = {
  parliamentPeriodId: string; // z.B. "magdeburg-8" — Periode, deren Map+Registry die Zeile erzeugt hat (#450)
  sessionId: string;          // = sessionDate, ISO YYYY-MM-DD
  date: string;               // = sessionDate (explizites Datum-Feld für die Anzeige)
  votingId: number;           // +votingFilename.substring(11,14)
  agendaItem: string;         // Join-Schlüssel, z.B. "12.6"
  title: string;              // votingSubject.title (OCR)
  type: string;               // votingSubject.type (kann "" sein)
  accepted: boolean;          // J > N (== votingAccepted der Sitzungsseite)
  counts: { J: number; N: number; E: number; O: number };
  votesByFactions: VotesByFaction[]; // exakt wie _votings.astro getVotesByFactions, gegen Perioden-Registry
};

// wiederverwendet aus astro/src/pages/pp/[parliamentPeriodId]/session/[sessionId]/_model.ts
type VotesByFaction = {
  factionId: string;
  factionName: string;
  orderIndex: number; // Fraktionen nach Sitzen absteigend
  votes: { personName: string; vote: string }[]; // J/N/E/O, sortiert J,N,E,sonst
};
```

**Verlinkung** je Abstimmung auf die Detailseite: `/pp/{parliamentPeriodId}/session/{sessionId}/voting/{votingId}`.

## Erzeugung

Neuer Deno-Generator `src/scripts/generate-paper-votings/` nach dem Muster von `generate-paper-assets` (`cli.ts` + `index.ts` + Generator + Writer + `acceptance-tests/`):

1. Je Wahlperiode laden: `data/{period}/registry.json`, `data/{period}/voting-paper-map.json`, alle `data/{period}/{date}/session-scan-*.json`.
2. Reverse-Index bilden: für jede `(sessionDate, agendaItem→paperId)`-Zuordnung **alle** Scan-Items mit gleichem `agendaItem` finden → je Treffer ein `PaperVotingItem`, angereichert mit `parliamentPeriodId`, `sessionId`/`date`, `votingId`, `title`, `type`, `accepted`, `counts` und `votesByFactions` (via wiederverwendeter `getVotesByFactions`-Logik gegen die Perioden-Registry).
3. Über alle Perioden nach `paperId` gruppieren (#450), je Drucksache sortieren (sessionDate desc, votingId asc).
4. Batchen: `Math.floor(paperId / 100)`, mit `padStart(4, '0')`; jede Batch als Array `PaperVotingsDto[]` nach `web-assets/paper-votings/paper-votings-{batch}.json` schreiben.

## Client

Analog zum bestehenden Paper-Laden in `astro/src/pages/paper/index.astro`:

```js
const batchNo = `${Math.floor(paperId / 100)}`.padStart(4, '0');
const res = await fetch(`${AWS_CLOUDFRONT_BASE_URL}/web-assets/paper-votings/paper-votings-${batchNo}.json`);
const batch = await res.json(); // PaperVotingsDto[]
const entry = batch.find((e) => e.paperId === paperId);
// Tab »Abstimmungen« disabled, wenn entry undefined oder entry.votings leer.
```

## Offene Umsetzungs-Notiz (kein Grilling nötig)

- **Unbekannte Person im Scan:** `getVotesByFactions` der Sitzungsseite wirft heute, wenn ein Stimmen-Name nicht in der Registry steht — dieser Invariant wird beim Sitzungs-Build ohnehin erzwungen. Der neue Generator berührt *alle* Sitzungen auf einmal; er soll denselben strikten Join verwenden (bei unbekanntem Namen hart fehlschlagen), damit keine neue Toleranz entsteht und Datenlücken sofort auffallen. Reine Umsetzungsfrage, keine offene Entscheidung.
