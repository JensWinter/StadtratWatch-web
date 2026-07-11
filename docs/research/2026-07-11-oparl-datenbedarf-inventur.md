# Datenbedarf-Inventur: OParl-Rohdaten im Astro-Build

Datum: 2026-07-11
Frage: Welche Felder und Strukturen aus den vier rohen OParl-Dateien
(`data/oparl-magdeburg/meetings.json`, `agenda-items.json`, `consultations.json`, `papers.json`)
konsumiert der Astro-Build tatsächlich?

## Fazit

Der Astro-Build lädt alle vier Rohdateien vollständig (zusammen ca. **103 MB**: meetings 5,9 MB / 3.670 Objekte, agenda-items 39 MB / 77.806, consultations 25 MB / 42.864, papers 33 MB / 13.978), nutzt daraus aber nur **zwei eng umrissene Anwendungsfälle**: (1) das Nachschlagen einer Drucksachen-ID zu einer Abstimmung über die Kette Meeting→AgendaItem→Consultation→Paper (`getPaperId`) und (2) die Liste der Drucksachen der letzten drei Monate auf `/papers/`. Dafür werden pro Typ nur **2–6 Felder** gelesen; nach dem Filter auf Stadtrats-Sitzungen (Organisation `gr/1`) bleiben 146 von 3.670 Meetings, 17.955 von 77.806 AgendaItems und 15.212 von 42.864 Consultations relevant. Zwei zweckgebundene Derivate drängen sich auf: eine kleine **Voting→Paper-Zuordnungstabelle** (Größenordnung zehner bis wenige hundert KB, ersetzt drei Rohdateien komplett) und eine **Recent-Papers-Projektion** (~50 KB, ersetzt papers.json). Das Derivat-Vorbild existiert bereits: die vom Deno-Skript `generate-paper-assets` erzeugten Batch-Assets `web-assets/papers/papers-*.json`, die die Seite `/paper/` clientseitig lädt.

## 1. Einstiegspunkt: Content Collections

Die vier Collections lesen die Rohdateien jeweils vollständig ein und typisieren sie ohne Validierung (`z.custom<...>`):

- `oparlMeetings` ← `../data/oparl-magdeburg/meetings.json` — `astro/src/content.config.ts:48–54`
- `oparlAgendaItems` ← `../data/oparl-magdeburg/agenda-items.json` — `astro/src/content.config.ts:56–62`
- `oparlConsultations` ← `../data/oparl-magdeburg/consultations.json` — `astro/src/content.config.ts:64–70`
- `oparlPapers` ← `../data/oparl-magdeburg/papers.json` — `astro/src/content.config.ts:72–78`

Vor dem Build lädt `astro/scripts/fetch-oparl/fetch-oparl.mjs` (Zielverzeichnis `data/oparl-magdeburg`, `astro/scripts/fetch-oparl/fetch-oparl.mjs:15–17`) den kompletten Snapshot von CloudFront — laut `NEEDED_FILES` sogar **neun** Dateien inkl. `persons.json`, `memberships.json`, `locations.json`, `files.json`, `organizations.json` (`astro/scripts/fetch-oparl/fetch-oparl.lib.mjs:13–24`), von denen der Astro-Build nur die vier o. g. konsumiert.

## 2. Konsumenten und Feld-Inventar

### 2.1 `astro/src/pages/pp/[parliamentPeriodId]/_helpers.ts` (Verteiler für alle `/pp/…`-Seiten)

Lädt drei der vier Collections und filtert:

| Objekt | Genutzte Felder | Verwendung |
|---|---|---|
| Meeting | `organization` (Array), `id` | Filter: nur Meetings, deren `organization` die URL `https://ratsinfo.magdeburg.de/oparl/bodies/0001/organizations/gr/1` (Stadtrat) enthält — `_helpers.ts:7–12` |
| AgendaItem | `meeting` | Join: nur AgendaItems, deren `meeting` auf ein gefiltertes Meeting zeigt — `_helpers.ts:13–17` |
| Consultation | `meeting` | Join: analog — `_helpers.ts:18–22` |

Die **vollständigen** gefilterten Objekte werden dann als `getStaticPaths`-Props an alle Wahlperioden-Seiten weitergereicht (`_helpers.ts:29–33`) und durch die Ableitungsketten `getParliamentPeriodWithSessionsPaths` (`_helpers.ts:85–94`), `getParliamentPeriodWithSessionPaths` (`_helpers.ts:110–125`), `getParliamentPeriodWithFactionPaths` (`_helpers.ts:141–157`) und `getParliamentPeriodWithSessionAndVotingPaths` (`_helpers.ts:192–211`) durchgeschleift. Bei `getParliamentPeriodWithPartyPaths` (`_helpers.ts:170–176`) und `getParliamentPeriodWithPersonPaths` (`_helpers.ts:225–231`) werden die OParl-Props **nicht** mehr weitergegeben.

`oparlPapers` wird von `_helpers.ts` **gar nicht** geladen — die Paper-ID wird stattdessen aus der Consultation-URL abgeleitet (siehe 2.2).

### 2.2 `astro/src/pages/pp/[parliamentPeriodId]/_helpers2.ts` — `getPaperId()` (der eigentliche Kern-Konsument)

Join-Kette Sitzungsdatum → Meeting → AgendaItem → Consultation → Paper-ID:

| Objekt | Genutzte Felder | Verwendung |
|---|---|---|
| Meeting | `start` (nur `slice(0, 10)`, also Datum), `id` | Meeting zur Session finden: `meeting.start.slice(0,10) === sessionDate` — `_helpers2.ts:15–17` |
| AgendaItem | `meeting`, `number`, `consultation`, `id` (nur Log) | TOP zur Abstimmung finden: `agendaItem.meeting === meeting.id && agendaItem.number === voting.votingSubject.agendaItem` — `_helpers2.ts:22–28` |
| Consultation | `id`, `paper` | `consultation.id === agendaItem.consultation`, dann numerische Paper-ID als letztes URL-Segment: `+consultation.paper.split('/').pop()` — `_helpers2.ts:39–41, 48–53` |

Ergebnis ist eine **einzige Zahl** (`paperId`) pro Abstimmung, verwendet ausschließlich für Links auf `/paper?paperId=…`.

### 2.3 Abnehmer von `getPaperId`

**Abstimmungs-Detailseite** `astro/src/pages/pp/[parliamentPeriodId]/session/[sessionId]/voting/[votingId]/index.astro`:
- destrukturiert `oparlMeetings`, `oparlAgendaItems`, `oparlConsultations` aus den Props (`index.astro:15–22`),
- ruft `getPaperId(...)` auf (`index.astro:79–85`),
- rendert daraus nur den Link `/paper?paperId=${paperId}` am Motion-Verweis (`index.astro:134–141`).

**Fraktions-Anträge** `astro/src/pages/pp/[parliamentPeriodId]/faction/[factionId]/_motions.astro`:
- nimmt die drei Arrays als Props entgegen (`_motions.astro:25–41`),
- ruft pro Antrag `getPaperId(...)` auf (`_motions.astro:68–74`),
- nutzt `paperId` nur als `MotionListItem.paperId` für den Link `/paper?paperId=…` (`_motions.astro:99, 198–203`).

Die Fraktionsseite `astro/src/pages/pp/[parliamentPeriodId]/faction/[factionId]/index.astro` destrukturiert die drei Arrays (`index.astro:15–22`) und reicht sie unverändert an `<Motions …>` weiter (`index.astro:78–86`).

### 2.4 Drucksachen-Liste `/papers/`

`astro/src/pages/papers/index.astro` lädt als einzige Seite `oparlPapers` (`index.astro:6–7`) und ruft `getRecentMainPapers` + `getRecentPapersPeriod` auf (`index.astro:8–11`).

`astro/src/pages/papers/_helpers.ts` — `getRecentMainPapers()` (`_helpers.ts:5–22`):

| Feld (OparlPaper) | Verwendung |
|---|---|
| `subordinatedPaper` | Filter: nur Haupt-Drucksachen (`(subordinatedPaper ?? []).length === 0`) — `_helpers.ts:10` |
| `date` | Filter: nicht leer und ≥ Anfang des Monats vor zwei Monaten — `_helpers.ts:11–12` |
| `id` | `oparlId` sowie numerische ID als letztes URL-Segment — `_helpers.ts:14–15` |
| `paperType` | Anzeige (`type`) — `_helpers.ts:18` |
| `reference` | Anzeige — `_helpers.ts:19` |
| `name` | Anzeige (`title`) — `_helpers.ts:20` |

Ziel-Modell: `RecentPaper` (`astro/src/pages/papers/_models.ts:1–9`); Tests decken exakt diese Felder ab (`astro/src/pages/papers/_helpers.test.ts:31–43`). Gerendert werden Datum, Typ+Referenz (als Link `/paper?paperId=…`) und Titel (`astro/src/pages/papers/index.astro:33–45`).

### 2.5 Seiten, die OParl-Props erhalten, aber nicht nutzen (reiner Durchlauf)

Diese Seiten beziehen ihre `getStaticPaths` aus `_helpers.ts` und bekommen die drei Arrays damit in die Props gelegt, greifen aber nie darauf zu (kein `oparl*`-Bezug im Dateiinhalt):

- `astro/src/pages/pp/[parliamentPeriodId]/index.astro:12`
- `astro/src/pages/pp/[parliamentPeriodId]/sessions/index.astro:11`
- `astro/src/pages/pp/[parliamentPeriodId]/factions/index.astro:24`
- `astro/src/pages/pp/[parliamentPeriodId]/persons/index.astro:11`
- `astro/src/pages/pp/[parliamentPeriodId]/parties/index.astro:22`
- `astro/src/pages/pp/[parliamentPeriodId]/session/[sessionId]/index.astro:14–18` (destrukturiert nur `parliamentPeriod`, `sessionInput`)
- Party-/Person-Seiten erhalten sie gar nicht mehr (siehe 2.1).

Damit sind die **einzigen echten Feld-Konsumenten** im Astro-Build: `_helpers.ts` (Filter), `_helpers2.ts` (`getPaperId`), `papers/_helpers.ts` (`getRecentMainPapers`).

## 3. Feld-Nutzung gesamt (Astro-Build)

| Typ | Genutzte Felder | Datei-Referenzen |
|---|---|---|
| OparlMeeting | `id`, `start`, `organization` | `_helpers.ts:7–12`, `_helpers2.ts:15–17` |
| OparlAgendaItem | `id` (nur Log), `meeting`, `number`, `consultation` | `_helpers.ts:13–17`, `_helpers2.ts:22–28, 40` |
| OparlConsultation | `id`, `meeting`, `paper` | `_helpers.ts:18–22`, `_helpers2.ts:39–53` |
| OparlPaper | `id`, `name`, `date`, `paperType`, `reference`, `subordinatedPaper` | `papers/_helpers.ts:10–20` |

## 4. Ungenutzte Felder (im Astro-Build)

Referenz: Typdefinitionen in `astro/src/models/oparl.ts`. „Ungenutzt“ = nirgends in `astro/src` gelesen; die Deno-Pipeline (die dieselben Modelle über `@srw-astro/models` nutzt) ist hier ausgeklammert.

- **OparlMeeting** (`oparl.ts:22–32`): `type`, `name`, `created`, `modified`, `deleted`, `cancelled`, `end`, `location`, `participant`, `invitation`, `resultsProtocol`, `verbatimProtocol` — ungenutzt. Genutzt nur: `id`, `start`, `organization`.
- **OparlAgendaItem** (`oparl.ts:34–42`): `type`, `name`, `created`, `modified`, `deleted`, `order`, `public`, `result`, `auxiliaryFile` — ungenutzt. Genutzt nur: `id`, `meeting`, `number`, `consultation`.
- **OparlConsultation** (`oparl.ts:44–51`): `type`, `name`, `created`, `modified`, `deleted`, `organization`, `agendaItem`, `role`, `authoritative` — ungenutzt. Genutzt nur: `id`, `meeting`, `paper`.
- **OparlPaper** (`oparl.ts:53–64`): `type`, `created`, `modified`, `deleted`, `consultation` (das **eingebettete** Consultation-Array!), `body`, `location`, `auxiliaryFile`, `superordinatedPaper`, `underDirectionOf` — ungenutzt. Genutzt nur: `id`, `name`, `date`, `paperType`, `reference`, `subordinatedPaper`.
- **OparlBody** (`oparl.ts:10–20`), **OparlFile** (`oparl.ts:66–74`), **OparlOrganization** (`oparl.ts:76–85`): im Astro-Build **komplett ungenutzt** (nur von Deno-Skripten über den Workspace-Reexport konsumiert).

Nebenbefunde (Modell vs. reale Daten, stichprobenartig per `jq '.[0]'` verifiziert):
- `OparlAgendaItem.order` ist als `number` typisiert (`oparl.ts:35`), in den Rohdaten aber ein String (`"order": "19"`). Unkritisch, da ungenutzt.
- `OparlMeeting.location` ist als `string` typisiert (`oparl.ts:27`), in den Rohdaten aber ein eingebettetes Location-Objekt. Ebenfalls ungenutzt.

## 5. Mengengerüst (Stand 2026-07-11)

| Datei | Größe | Objekte | davon Stadtrat (`gr/1`) |
|---|---|---|---|
| meetings.json | 5,9 MB | 3.670 | 146 |
| agenda-items.json | 39 MB | 77.806 | 17.955 (via Meeting-Join) |
| consultations.json | 25 MB | 42.864 | 15.212 (via Meeting-Join) |
| papers.json | 33 MB | 13.978 | – (kein Org-Filter; Recent-Filter ergab 230 Treffer) |

Projektionsgrößen (jq-Messung, gefiltert auf `gr/1`, nur genutzte Felder, volle OParl-URLs):
- Meetings `{id, start}`: ~16 KB
- AgendaItems `{id, meeting, number, consultation}`: ~4,4 MB (dominiert von URL-Strings)
- Consultations `{id, paper}`: ~2,3 MB
- Papers „recent main papers“ `{id, date, paperType, reference, name}`: ~52 KB (230 Papers)

Registry-Sitzungen, für die `getPaperId` überhaupt gebraucht wird: 35 (magdeburg-7) + 38 (magdeburg-8) = **73 Sitzungen** — deutlich weniger als die 146 `gr/1`-Meetings (die restlichen liegen außerhalb der erfassten Wahlperioden bzw. in der Zukunft).

## 6. Derivat-Kandidaten (Input für Design-Ticket, keine Festlegung)

Vorbild: `generate-paper-assets` erzeugt bereits zweckgebundene Batch-Derivate (`papers-{batchNo}.json`, `paper-graphs-{batchNo}.json`, `src/scripts/generate-paper-assets/paper-assets-writer.ts:14` und `paper-graph-assets-writer.ts:14`; lokal unter `data/papers/`), die die Seite `/paper/` **clientseitig** von CloudFront lädt (`astro/src/pages/paper/index.astro:253–256, 284–288`) — ganz ohne Astro-Build-Beteiligung.

1. **`voting-paper-map`** (pro Wahlperiode, z. B. `data/{period-id}/voting-paper-map.json`, oder pro Sitzung neben den `session-*`-Dateien):
   - Inhalt: `{ sessionDate → { agendaItemNumber → paperId } }` — exakt das, was `getPaperId` (`_helpers2.ts:8–54`) heute zur Build-Zeit aus drei Rohdateien joint.
   - Zuschnitt: nur die 73 Registry-Sitzungen; pro Sitzung wenige Dutzend bis ~250 TOPs.
   - Größenordnung: einige zehn KB pro Wahlperiode (numerische Paper-IDs statt URLs); gesamt < 200 KB.
   - Effekt: `meetings.json`, `agenda-items.json`, `consultations.json` (70 MB) fallen als Astro-Build-Input **komplett** weg; die Props-Durchschleifung in `_helpers.ts` entfällt.

2. **`recent-papers.json`** (global, z. B. als `web-assets`-Derivat oder in `data/`):
   - Inhalt: Projektion `{id, date, paperType, reference, name}` der Haupt-Drucksachen (ohne `subordinatedPaper`-Kinderfilter-Rest), Fenster z. B. „letzte 6 Monate“ als Superset des 3-Monats-Filters von `papers/_helpers.ts:6–12` (der Filter selbst bleibt im Build, da das Fenster vom Build-Datum abhängt).
   - Größenordnung: ~50–150 KB statt 33 MB papers.json.
   - Effekt: `papers.json` fällt als Astro-Build-Input weg.

3. **Fallback (weniger invasiv): gefilterte + projizierte Rohdatei-Spiegel** (`meetings-gr1.json` ~16 KB, `agenda-items-gr1.json` ~4,4 MB, `consultations-gr1.json` ~2,3 MB, `papers-slim.json`):
   - Behält die bestehende Join-Logik in `_helpers2.ts` unverändert bei, reduziert nur das Volumen von ~103 MB auf ~7 MB.
   - Sinnvoll, falls künftige Features (z. B. TOP-Ergebnisse `result`, Consultation-`role`) mehr Felder brauchen könnten.

Erzeugungsort in allen Fällen: die Deno-Pipeline (analog `generate-paper-assets`), da `data/oparl-magdeburg/` ohnehin extern gehostet ist und vor dem Astro-Build per `fetch-oparl` synchronisiert wird — ein kleines Derivat würde auch diesen Download (`NEEDED_FILES`, neun Dateien) für den Web-Build überflüssig machen bzw. drastisch verkleinern.

## 7. Nicht-Astro-Konsumenten (unberührt)

Diese Leser/Schreiber von `data/oparl-magdeburg/` sind von einer Astro-seitigen Derivat-Umstellung nicht betroffen und werden hier nicht inventarisiert:

- `src/scripts/scrape-oparl/` — **Schreiber** der Snapshot-Dateien (Dateinamens-Mapping in `src/scripts/scrape-oparl/oparl-filenames.ts:17–22`).
- `src/scripts/shared/oparl/oparl-objects-store.ts:25–37` — zentrale Leseschicht (liest `meetings.json`, `agenda-items.json`, `consultations.json`, `papers.json` u. a.), genutzt von den Repositories in `src/scripts/shared/oparl/`.
- `src/scripts/generate-paper-assets/` (`cli.ts:46`), `src/scripts/download-paper-files/` (`cli.ts:51`), `src/scripts/index-search/` (`cli.ts:46`) — konsumieren den Snapshot über `--ratsinfo-dir`.
- `astro/scripts/fetch-oparl/` — Download-Synchronisation des Snapshots von CloudFront vor dem Astro-Build (kein Feld-Konsument, aber Transport der vollen Dateien).
