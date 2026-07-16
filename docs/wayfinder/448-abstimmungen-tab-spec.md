# Spec + Implementierungsplan: Tab »Abstimmungen« auf der Drucksachen-Detailseite

**Handoff-Dokument.** Übergabefertige Spezifikation plus Schritt-für-Schritt-Implementierungsplan (kein Code). Entstanden aus Wayfinder-Map [#448](https://github.com/JensWinter/StadtratWatch-web/issues/448); alle Einzelentscheidungen sind in den verlinkten Tickets/Dokumenten belegt.

Quellen: Architektur [#449](https://github.com/JensWinter/StadtratWatch-web/issues/449) · Cross-Period [#450](https://github.com/JensWinter/StadtratWatch-web/issues/450) (`docs/wayfinder/450-cross-period-papers.md`) · Schema+Generator [#451](https://github.com/JensWinter/StadtratWatch-web/issues/451) (`docs/wayfinder/451-paper-votings-schema.md`) · Client [#452](https://github.com/JensWinter/StadtratWatch-web/issues/452) (`docs/wayfinder/452-abstimmungen-tab-client.md`).

---

## 1. Ziel

Ein zusätzlicher Tab **»Abstimmungen«** auf der Drucksachen-Detailseite (`/paper?paperId=`). Er listet **alle tatsächlich gescannten Abstimmungen zu genau dieser Drucksache** — je Abstimmung mit vollständiger Aufschlüsselung nach Fraktion/Person (wie auf der Sitzungsdetailseite), mit Ergebnis, und verlinkt auf die Abstimmungs-Detailseite `/pp/{parliamentPeriodId}/session/{sessionId}/voting/{votingId}`.

Verhalten: Label »Abstimmungen« · **deaktiviert, wenn leer** · **neueste zuerst**.

## 2. Architektur-Entscheidung (Überblick)

Die Drucksachenseite bleibt **client-gerendert** (Alpine, wahlperioden-agnostisch). Die paper→votings-Zuordnung existiert heute nur vorwärts (`data/{period}/voting-paper-map.json`) und die Fraktions-/Personen-Auflösung liegt nur in der **SSR**-Komponente `_votings.astro` — beides zur Client-Laufzeit nicht verfügbar. Deshalb:

- Ein **neuer Deno-Generator** dreht die Zuordnung zur **Build-Zeit** um und löst dabei Stimmen→Personen→Fraktionen auf (dort, wo `registry.json` und `session-scan` ohnehin liegen).
- Ergebnis ist ein **self-contained, gebatchtes CloudFront-Web-Asset** `web-assets/paper-votings/paper-votings-{batch}.json` — **kein** committetes `data/`-Derivat (personen-granulare Nutzlast zu groß für git).
- Der Client lädt genau die eine Batch-Datei seiner `paperId` und rendert daraus den Tab ohne weitere Fetches.

Der bestehende, rein OParl-basierte `generate-paper-assets`-Generator bleibt **unangetastet** (keine Cross-Domain-Kopplung Scans/Registry ↔ OParl).

## 3. Datenfluss

```
data/{period}/registry.json          ─┐
data/{period}/voting-paper-map.json  ─┤→  generate-paper-votings (Deno, Build-Zeit)
data/{period}/{date}/session-scan-*  ─┘        │  Reverse-Lookup + Fraktions-/Personen-Join
                                               ▼
                        web-assets/paper-votings/paper-votings-{batch}.json   (S3/CloudFront)
                                               │  lazy? nein — eager in init()
                                               ▼
        astro/src/pages/paper/index.astro  →  Alpine-Tab »Abstimmungen«
```

## 4. Asset-Schema

Batch-Datei `web-assets/paper-votings/paper-votings-{batch}.json` ist ein **JSON-Array** (analog `papers-{batch}.json`, das der Client per `batch.find(...)` durchsucht). `batch = Math.floor(paperId / 100)`, `padStart(4, '0')`.

```ts
type PaperVotingsDto = {
  paperId: number;
  votings: PaperVotingItem[]; // vorsortiert: sessionDate desc, dann votingId asc
};

type PaperVotingItem = {
  parliamentPeriodId: string; // z.B. "magdeburg-8" — Periode, deren Map+Registry die Zeile erzeugt (#450)
  sessionId: string;          // = sessionDate, ISO YYYY-MM-DD
  date: string;               // = sessionDate (explizites Anzeigefeld)
  votingId: number;           // +votingFilename.substring(11,14) — wie getVotingId (session-utils.ts)
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
  votes: { personName: string; vote: string }[]; // sortiert J,N,E,sonst
};
```

## 5. Reverse-Lookup / Join (Generator-Kern)

- **Join-Schlüssel:** exakter String-Vergleich auf `agendaItem` zwischen `voting-paper-map[sessionDate][agendaItem]` (→ `paperId`) und den `session-scan`-Items (`votingSubject.agendaItem`).
- **Schnitt map × session-scan:** `voting-paper-map` enthält *alle* TOP mit OParl-Consultation→Paper, auch **ohne** gescannte Abstimmung. **Nur** Zuordnungen mit vorhandenem Scan-Item zählen. Drucksachen ohne Schnitt erscheinen gar nicht im Asset ⇒ Tab automatisch **deaktiviert, wenn leer**.
- **Mehrfach-Scans je (Session, agendaItem):** kommen real vor (z.B. paperId `243686`, 2024-07-08, agendaItem `12.6` → Scans `012` und `014`). **Alle** werden zu je einer eigenen Abstimmungszeile (eigene `votingId`/`accepted`/`counts`/`votesByFactions`). **Keine** Deduplizierung.
- **Cross-Period (#450):** **alle** Perioden-Maps scannen; Treffer je `paperId` zusammenführen. Jede Zeile trägt `parliamentPeriodId`; `votesByFactions` wird gegen die `registry.json` der **jeweiligen** Periode gejoint. Paper-IDs sind global eindeutig (keine Kollision). Live-Beispiel: `239123` »Sanierung Neustädter See« mit Scans in P7 (2022-09-01) und P8 (2024-10-17).
- **`votingId`:** `+votingFilename.substring(11, 14)` (z.B. `2024-07-08-012.png` → `12`).
- **`accepted`/`counts`:** vorberechnet aus den Stimmen — `accepted = (J-Anzahl > N-Anzahl)`, identisch zu `votingAccepted` in `_votings.astro`. `counts` zählt `J/N/E` und alles übrige als `O`.
- **`votesByFactions`:** exakt die Logik aus `_votings.astro` `getVotesByFactions` — Fraktionen nach `seats` absteigend, je Fraktion Stimmen sortiert J→N→E→sonst, jede Stimme `{ personName, vote }`.
- **Sortierung:** der **Generator** liefert `votings` je Drucksache fertig sortiert: `sessionDate` **absteigend**, bei Gleichstand `votingId` **aufsteigend**. Client rendert nur.
- **Strikter Person-Join:** wie `getVotesByFactions` heute **hart fehlschlagen**, wenn ein Stimmen-`name` nicht in der Perioden-Registry steht (der Sitzungs-Build erzwingt diesen Invariant ohnehin). Keine neue Toleranz einführen — Datenlücken sollen sofort auffallen.

## 6. Generator-Implementierung (Deno)

Neuer Ordner `src/scripts/generate-paper-votings/` nach dem Muster von `generate-paper-assets` (`cli.ts` + `index.ts` + Generator + Writer + `acceptance-tests/`). Modelle aus `astro/src/models/` via `@srw-astro/models` importieren; `VotesByFaction`/`getVotesByFactions`-Logik als geteilte Funktion bereitstellen (siehe 6.1).

**Schritte im Generator:**

1. **Perioden ermitteln:** `<data-dir>` nach `{period-id}/registry.json` scannen (wie `generate-oparl-derivatives`).
2. **Je Periode laden:** `registry.json`, `voting-paper-map.json`, alle `{date}/session-scan-*.json`.
3. **Reverse-Index bilden:** für jede `(sessionDate, agendaItem → paperId)`-Zuordnung **alle** Scan-Items derselben Session mit gleichem `agendaItem` finden → je Treffer ein `PaperVotingItem`, angereichert mit `parliamentPeriodId`, `sessionId`/`date`, `votingId`, `title`, `type`, `accepted`, `counts`, `votesByFactions` (gegen die Perioden-Registry).
4. **Über alle Perioden nach `paperId` gruppieren** (#450), je Drucksache sortieren (sessionDate desc, votingId asc) → `PaperVotingsDto`.
5. **Batchen** (`Math.floor(paperId/100)`, `padStart(4,'0')`) und je Batch `PaperVotingsDto[]` nach `paper-votings-{batch}.json` schreiben (Writer analog `PaperAssetsFileWriter`).

**CLI (`cli.ts`):** Argumente `--data-dir` (Wurzel mit den `{period}/`-Ordnern) und `--output-dir`. Council-Org-Id wird **nicht** gebraucht (rein registry-/scan-basiert). `--help`/`checkArgs` wie im Vorbild.

**Determinismus:** stabil sortierte Ausgabe (Batches, Zeilen), damit ein wiederholter Lauf keinen Diff erzeugt.

### 6.1 Geteilte `getVotesByFactions`-Logik

`getVotesByFactions` (und `votingAccepted`) leben heute lokal in `_votings.astro`. Für den Generator die Kernlogik in ein von **beiden** Seiten importierbares Modul in `astro/src/models/` oder `astro/src/data-analysis/` extrahieren (z.B. `votes-by-factions.ts`), damit Sitzungsseite und Generator garantiert dieselbe Aufschlüsselung erzeugen. `_votings.astro` auf die extrahierte Funktion umstellen (reines Refactoring, keine Verhaltensänderung). Das Modul muss frei von Astro-/Browser-Abhängigkeiten sein (nur `Registry`/`SessionScan`-Typen), damit Deno es über `@srw-astro/models` ziehen kann.

### 6.2 Docker + HOWTO

`docker/generate-paper-votings.Dockerfile` nach dem Muster von `generate-paper-assets.Dockerfile`. Abschnitt in `docs/guides/HOWTO.md` ergänzen (Build + Run, Reihenfolge in der Pipeline nach den OParl-Derivaten/Paper-Assets, vor/neben `index-search`).

## 7. Deployment des Assets

Die Batch-Dateien landen im selben S3-Bucket/CloudFront wie `web-assets/papers/` und werden über **denselben operativen Upload-Weg** wie die bestehenden Paper-Assets nach `web-assets/paper-votings/` synchronisiert. ~~Weil der Client per `find` auf `paperId` sucht, ist keine CloudFront-Invalidierung pro Inhalt nötig, solange Batchdateien überschrieben werden~~ (ggf. Standard-Invalidierung wie bei den übrigen Web-Assets).

> **Erledigt in [#457](https://github.com/JensWinter/StadtratWatch-web/issues/457).** Der Upload-Weg ist identifiziert und dokumentiert: **manueller Upload über die AWS-S3-Konsole**, siehe `docs/guides/publishing-web-assets.md`.
>
> **Korrektur zur Invalidierung:** Die oben durchgestrichene Aussage ist falsch. Der `find` auf `paperId` betrifft nur, wie der Client *innerhalb* einer Batch-Datei sucht, und hat mit Edge-Caching nichts zu tun. Da die Batch-Dateinamen stabil sind, in-place überschrieben werden und die Web-Assets **keinen `Cache-Control`-Header** ausliefern, ist nach jedem Upload sehr wohl eine CloudFront-Invalidierung nötig — sonst liefern die Edges bis zum Ablauf der Default-TTL alte Daten. Der inhaltsadressierte `oparl/`-Prefix ist der Sonderfall, der ohne Invalidierung auskommt; diese Begründung darf nicht auf `web-assets/` übertragen werden.

## 8. Client-Implementierung (`astro/src/pages/paper/index.astro`)

**Laden (eager):** Das Batch-Asset in `init()` **zusammen mit** den Paper-Daten laden (analog `papers-*`/`paper-graphs-*`). Damit ist der `disabled-wenn-leer`-Zustand sofort korrekt — kein separater Existenz-Check. 404 oder kein `find`-Treffer ⇒ `paperVotings = []` ⇒ Tab disabled, **keine** Fehlermeldung.

```js
// zusätzliche State-Felder in Alpine data('paper'):
paperVotings: [] as PaperVotingItem[],
showPeriodBadge: false,

// in init(), nach dem Laden des Papers:
const pvBatchNo = `${Math.floor(paperId / 100)}`.padStart(4, '0');
try {
  const res = await fetch(`${AWS_CLOUDFRONT_BASE_URL}/web-assets/paper-votings/paper-votings-${pvBatchNo}.json`);
  if (res.ok) {
    const batch = (await res.json()) as PaperVotingsDto[];
    this.paperVotings = batch.find((e) => e.paperId === paperId)?.votings ?? [];
  }
} catch { /* Tab bleibt disabled */ }
this.showPeriodBadge = new Set(this.paperVotings.map((v) => v.parliamentPeriodId)).size > 1;
```

**Tab + Rendering:** neuer `<input role="tab" aria-label="Abstimmungen">` samt `<div class="tab-content">`, eingefügt bei den bestehenden Tabs. `x-bind:disabled="paperVotings.length === 0"` (analog Tab »Zugehörige Drucksachen«).

**Darstellung (Entscheidungen #452):**
- **Kartenliste** statt Sitzungs-Timeline (Abstimmungen stammen aus mehreren Sitzungen/Perioden — kein Timeline-Chrome, keine Lead/Trailing-`<hr>`, kein mittlerer Icon-Knoten).
- Je Abstimmung eine **standalone Karte**, als `<a>` verlinkt auf `/pp/${voting.parliamentPeriodId}/session/${voting.sessionId}/voting/${voting.votingId}`, ganze Karte klickbar (`hover:bg-base-200`).
- **Kopf:** Perioden-Badge **nur wenn `showPeriodBadge`** · Datum (`formatDate(date)`) · `agendaItem` (»TOP …«) + `type` als `badge badge-neutral badge-sm` (wenn `type !== ''`) · Ergebnis-Pill angenommen/abgelehnt aus `accepted`.
- **Titel:** `title` in `text-base`.
- **Zähler-Zeile (Hybrid):** `counts.J`/`.N`/`.E`/`.O` mit `text-success`/`text-error`/`text-warning`/`text-base-content/60`.
- **Aufschlüsselung:** `votesByFactions` — je Fraktion `factionName:` + Statuspunkte je Person (`status status-lg`, `status-success`/`-error`/`-warning`, sonst neutral), `tooltip`/`data-tip` = `personName`. Markup 1:1 aus `_votings.astro` Z.153–175, in Alpine-`<template x-for>` statt Astro-`.map()`.
- **Kein** »Nur Sachbeschlüsse«-Filter (#451): je Drucksache ohnehin wenige Abstimmungen; `type` steht für spätere Badges bereit.
- TypeScript-Typen (`PaperVotingsDto`, `PaperVotingItem`, `VotesByFaction`) im `<script>`-Block der Seite ergänzen (analog zu den bestehenden `Paper*`-Typen).

## 9. Tests

- **Generator (`acceptance-tests/`, `@std/testing` BDD):**
  - Schnitt map × scan: TOP mit Map-Eintrag aber ohne Scan → **nicht** im Asset; TOP mit Scan aber ohne Map-Eintrag → **nicht** im Asset.
  - Mehrfach-Scans je agendaItem → mehrere Zeilen (nicht dedupliziert).
  - Cross-Period: derselbe `paperId` mit Scans in zwei Perioden → beide Zeilen, je `parliamentPeriodId` mit korrekter Registry gejoint (Fixture nach dem `239123`-Fall).
  - `accepted`/`counts`/`votesByFactions` gegen ein Sitzungsseiten-Referenzergebnis (dieselbe geteilte Funktion, 6.1).
  - Sortierung (sessionDate desc, votingId asc) und Batching/`padStart`.
  - Strikter Join: unbekannter Personenname → Fehlschlag.
- **Geteilte Funktion (6.1):** Unit-Test, dass `_votings.astro` und Generator identische `VotesByFaction[]` liefern (bzw. ein Snapshot der extrahierten Funktion).
- **Client:** manuell via `npm run dev` — Drucksache mit Abstimmungen (Tab aktiv, Karten korrekt, Deep-Link stimmt), Drucksache ohne (Tab disabled), Cross-Period-Drucksache (Perioden-Badges sichtbar).

## 10. Umsetzungsreihenfolge (Checkliste)

1. `getVotesByFactions`/`votingAccepted` in ein geteiltes, Astro-freies Modul extrahieren; `_votings.astro` umstellen (Refactoring, grün halten).
2. `src/scripts/generate-paper-votings/` bauen (cli/index/generator/writer) + `acceptance-tests/`.
3. `deno fmt`/`deno lint`/`deno check src/` + `deno test` grün.
4. Generator lokal über `data/` laufen lassen; Stichprobe (`239123` cross-period, `243686` Mehrfach-Scan, eine leere Drucksache).
5. Docker + HOWTO-Abschnitt ergänzen.
6. Client-Tab in `paper/index.astro` ergänzen (eager Load, Typen, Kartenliste, Hybrid-Darstellung, Perioden-Badge nur cross-period).
7. `npm run format:check` + `npm test` grün; manuelle Sichtprüfung.
8. Operativen `web-assets/`-Upload-Schritt um `paper-votings/` erweitern (Abschnitt 7).

## 11. Bewusst außerhalb des Scopes

- **Abstimmungen zu verwandten Drucksachen** (sub-/superordinierte Papiere, Papier-Baum). Der Tab zeigt nur Abstimmungen zu genau dieser `paperId` (Map-Out-of-Scope, #448).
