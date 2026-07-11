# Spezifikation: OParl-Precompile statt Roh-Import im Astro-Build

**Status:** Umsetzungsreif · **Datum:** 2026-07-12
**Wayfinder-Map:** [#430](https://github.com/JensWinter/StadtratWatch-web/issues/430)
**Quell-Tickets:** [#431](https://github.com/JensWinter/StadtratWatch-web/issues/431) (Inventur), [#432](https://github.com/JensWinter/StadtratWatch-web/issues/432) (Modelle), [#433](https://github.com/JensWinter/StadtratWatch-web/issues/433) (Generator/Pipeline), [#434](https://github.com/JensWinter/StadtratWatch-web/issues/434) (Konsistenz), [#436](https://github.com/JensWinter/StadtratWatch-web/issues/436) (Migrationspfad)
**Umsetzung:** eigenes Folge-Issue (siehe Ende) — diese Spezifikation ist Planung, kein Code.

---

## 1. Ziel & Zielkriterium

Der Astro-Web-Build liest die rohen OParl-Daten (`data/oparl-magdeburg/`) heute direkt als Content Collections (~103 MB JSON). Diese Spezifikation ersetzt diesen Roh-Import durch einen **manuellen Precompile-Schritt**, der aus den Rohdaten **zwei kleine, zweckgebundene Derivate** erzeugt, die in Git committet und vom Build allein konsumiert werden.

**Zielkriterium (Definition of Done der Umsetzung):**

- Der Astro-Build liest `data/oparl-magdeburg/` **überhaupt nicht mehr**.
- `fetch-oparl` verschwindet vollständig aus dem Web-Build: `prebuild`, `predev` (`astro/package.json`), `netlify.toml`, lokales Dev-Setup.
- Roh-OParl-Zugriff braucht **nur** noch der Maintainer (der ohnehin `scrape-oparl`/`fetch-oparl` fährt), um die Derivate zu regenerieren.

## 2. Ist-Zustand (verifiziert 2026-07-12)

Vollständiges Feld-Inventar: [`docs/research/2026-07-11-oparl-datenbedarf-inventur.md`](../research/2026-07-11-oparl-datenbedarf-inventur.md).

Vier Roh-Collections in `astro/src/content.config.ts` (alle mit `z.custom<T>()` → **null** Laufzeitschutz):
`oparlMeetings`, `oparlAgendaItems`, `oparlConsultations` (aus `meetings.json`/`agenda-items.json`/`consultations.json`) und `oparlPapers` (aus `papers.json`).

**Nur drei echte Konsumenten, disjunkt in zwei Gruppen:**

| Gruppe | Roh-Collections | Konsumenten | Genutzte Felder |
|---|---|---|---|
| **A — Voting→Paper** | `oparlMeetings`, `oparlAgendaItems`, `oparlConsultations` | `_helpers.ts` (Filter auf Stadtrats-Org `…/organizations/gr/1` + Joins, reicht 3 komplette Arrays als `getStaticPaths`-Props durch die gesamte Pfad-Builder-Kette); `_helpers2.ts:getPaperId` (Resolver Meeting→AgendaItem→Consultation→paperId), aufgerufen von `session/[sessionId]/voting/[votingId]/index.astro` und `faction/[factionId]/_motions.astro` | Meeting `id/start/organization`; AgendaItem `id/meeting/number/consultation`; Consultation `id/meeting/paper` |
| **B — Papers-Liste** | `oparlPapers` | `papers/index.astro` + `papers/_helpers.ts:getRecentMainPapers` (`/papers/`-Liste, letzte 3 Monate) | Paper `id/name/date/paperType/reference/subordinatedPaper` |

- Fünf `/pp/…`-Seiten bekommen die OParl-Arrays als Props durchgereicht, **ohne sie zu nutzen** (reiner Durchlauf → fällt bei Migration weg).
- Die API-Routen unter `api/v1/` nutzen **nur** `parliamentPeriods`, **nicht** die Roh-OParl-Collections — nicht betroffen.
- Scrape-Läufe erfolgen **manuell** (kein Cron). CI/Netlify holen die Rohdaten heute per `fetch-oparl` (`prebuild`) aus S3/CloudFront.

Nebenbefund (außerhalb der Karte, nicht Teil der Umsetzung): zwei Modell-Abweichungen bei ungenutzten Feldern (`agendaItem.order` ist real ein String, `meeting.location` real ein Objekt).

## 3. Derivat-Modelle & Dateizuschnitt (#432, ergänzt durch #434)

Zwei getrennte, zweckgebundene Derivate — **kein** Bündel, **kein** getrimmter Roh-Spiegel. Kein Batching (reine Build-Inputs; Batching in `data/papers/` existiert nur fürs clientseitige Lazy-Load).

| Zweck | Datei | Zuschnitt |
|---|---|---|
| Voting→Paper-Map (ersetzt `getPaperId`-Join) | `data/{period-id}/voting-paper-map.json` | **pro Wahlperiode**, nur Registry-Sitzungen |
| Alle Haupt-Drucksachen, projiziert | `data/paper-index.json` | **eine globale Datei**, kein Zeitfilter im Derivat |

### Kanonische Modelle

Neue Datei `astro/src/models/oparl-derivatives.ts`:

```ts
export type VotingPaperMap = {
  [sessionDate: string]: { [agendaItemNumber: string]: number };
};

export type PaperIndexEntry = {
  oparlId: string;   // z. B. https://ratsinfo.magdeburg.de/oparl/bodies/0001/papers/12345
  id: string;        // numerischer Suffix, oparlId.split('/').pop()
  date: string;      // ISO YYYY-MM-DD
  paperType?: string;
  reference?: string;
  name: string;
};
```

- **`voting-paper-map.json`**: `sessionDate` = ISO-Datum der Sitzung; `agendaItemNumber` = `voting.votingSubject.agendaItem`; Wert = numerische Paper-Id (exakt das, was `getPaperId` heute zurückgibt: `+consultation.paper.split('/').pop()`). Enthält nur die Registry-Sitzungen der Periode.
- **`paper-index.json`**: **alle** Haupt-Drucksachen projiziert (Strukturfilter „`subordinatedPaper` leer" läuft im Generator). Der **datumsabhängige 3-Monats-Filter bleibt im Astro-Build** (`getRecentMainPapers` filtert künftig das Derivat) → kein eingebranntes Zeitfenster, keine fenster-bedingte Staleness.
- **`RecentPaper`** (mit `dateDisplay`, `astro/src/pages/papers/_models.ts`) bleibt build-internes Anzeige-Modell, künftig abgeleitet aus `PaperIndexEntry` — nicht ins Derivat-Modell gezogen.

### Modell-Ort & Zod-Schemata (#434)

- Kanonisch: `astro/src/models/oparl-derivatives.ts` mit **beiden** Typen **und** den zugehörigen **echten Zod-Schemata** (`z.object`/`z.record`). TS-Typen und Schemata synchron halten (z. B. Typ via `z.infer` ableiten). **Keine** `schemaVersion`, **keine** Metadaten-Hülle — selbstprüfendes Schema statt manuell gepflegter Version.
- Deno-Reexport: neue `src/deps/astro/oparl-derivatives.ts` mit `export * from '../../../astro/src/models/oparl-derivatives.ts';` **und** Eintrag `"./oparl-derivatives": "./oparl-derivatives.ts"` in `src/deps/astro/deno.json`.

### Verhältnis zu `data/papers/`

**Unberührt.** `data/papers/` bleibt das clientseitig von CloudFront geladene Batch-Verzeichnis (`papers-*.json` / `paper-graphs-*.json`) der `/paper/`-Seite. Die neuen Derivate sind reine Build-Inputs, liegen bewusst getrennt und mischen sich nicht mit dem Client-Asset-Lebenszyklus.

## 4. Generator & Pipeline-Einbettung (#433)

1. **Eigenständiges neues Deno-Skript `generate-oparl-derivatives`** (unter `src/scripts/generate-oparl-derivatives/`, Struktur analog `generate-paper-assets/`: `cli.ts`, `index.ts`, `model.ts`, …). **Nicht** mit `generate-paper-assets` verschmolzen — unterschiedlicher Output-Zweck/-Lebenszyklus; der zusätzliche Roh-OParl-Lesedurchgang ist billig.
2. **Manueller Maintainer-Schritt, committete Derivate, Pipeline-Position 2** neben `generate-paper-assets`. Liest lokales Roh-OParl, schreibt die Derivate, die committet werden. Beide Generatoren hängen nur an `scrape-oparl`, nicht voneinander → Reihenfolge zueinander egal. Der Web-Build liest **nur** die committeten Derivate.
3. **Vollregenerierung mit deterministischer, stabiler Sortierung** (Sessions nach Datum, Papers nach `id`/`date`), damit `git diff` exakt die inhaltlichen Änderungen zeigt. Keine Inkremental-Buchhaltung. **Kein** eingebetteter `generatedAt`-Zeitstempel (würde den sauberen Diff zerstören).
4. **Eigenes Dockerfile** `docker/generate-oparl-derivatives.Dockerfile` analog `docker/generate-paper-assets.Dockerfile` (reines `denoland/deno`-Base-Image). HOWTO dokumentiert beide Wege (`deno run` / Docker).
5. **CLI & Auto-Discovery.** Input über `OparlObjectsFileStore` (Repository-Pattern wiederverwenden). Der Generator **scannt `data/` nach `{period-id}/registry.json`** und regeneriert in **einem** Lauf **alle** Perioden-`voting-paper-map`s **und** die globale `paper-index.json` — **kein** `--period`-Flag. CLI-Args analog `generate-paper-assets`:
   - `--oparl-dir` (Default `data/oparl-magdeburg/`)
   - `--data-dir` (Default `data/`)
   - Outputs: `data/{period-id}/voting-paper-map.json` (je Periode) + `data/paper-index.json` (global).

## 5. Konsistenz- & Staleness-Absicherung (#434)

**Grundhaltung:** Aktive, minimale **fail-fast-Validierung im Astro-Build**, ausschließlich aus **committeten Dateien** (CI/Netlify haben laut #433 **keine** Roh-OParl → „im CI neu generieren und diffen" ist ausgeschlossen).

1. **Schema-Drift → echte Zod-Schemata.** Die zwei Derivat-Collections in `content.config.ts` bekommen die echten `z.object`/`z.record`-Schemata aus `oparl-derivatives.ts` statt `z.custom`. Der Build validiert die Form jeder Datei und bricht bei Abweichung ab (Feld umbenannt/Struktur geändert → altes File verletzt neues Schema → fail fast). Deckt „Schema ↔ Code laufen auseinander" **und** „altes committetes Derivat trifft neuen Code" strukturell ab.
2. **Vollständigkeit → referenzieller Check, nur Vorwärtsrichtung.** Build-Zeit-Check: Jeder Sitzungs-Key in `voting-paper-map.json` muss in der `registry.json` der jeweiligen Wahlperiode existieren. Die **Rückrichtung** (registry-Sitzung fehlt im Derivat) ist **kein** Fehler (eine Sitzung darf legitim keine drucksachen-verknüpften Abstimmungen haben; der Build kann ohne Rohdaten „fehlt" nicht von „leer" unterscheiden).
3. **Echte Staleness → bewusst kein Build-Gate, kein Zeitstempel.** Der einzige Wahrheits-Zeitstempel liegt bei den Rohdaten, die CI/Netlify nicht haben. Staleness bleibt Prozess-/Diff-Sache (dokumentierte Pipeline-Reihenfolge in HOWTO + PR-Review sieht den Diff).
4. **Ort → dediziertes Validierungsmodul via Astro-Build-Hook.** Der cross-file-Check (Punkt 2) lebt in einem kleinen, dedizierten Modul, aufgerufen aus einem Astro-Build-Hook (`astro:config:setup`/`astro:build:start` in `astro.config.mjs`) — einmal, früh. Sammelt **alle** Inkonsistenzen und meldet sie gebündelt mit klarer Meldung („Sitzung X in voting-paper-map fehlt in registry der Periode Y"), **dann** hartes fail fast (nicht beim ersten Fehler stoppen → spart Regenerierungs-Runden).

Zusammengefasst: Per-Datei-Form = Zod in `content.config.ts`; Cross-file-Referenz = Modul im Build-Hook. Keine Versionsnummer, keine Metadaten-Hülle, kein Zeitstempel, kein Staleness-Gate.

## 6. Migrationspfad der Seiten (#436)

**Pro Derivat, zwei sequenzielle Schritte** (die Konsumenten der zwei Derivate sind disjunkt) — nicht seitenweise (zu feingranular; Konsumenten teilen denselben Helper), nicht big-bang (verschenkt schrittweise Verifizierbarkeit).

**Schritt A — voting-paper-map konsumieren:**
- `_helpers2.ts:getPaperId` von der Kette Meeting→AgendaItem→Consultation→paper auf einen Lookup `votingPaperMap[sessionDate][voting.votingSubject.agendaItem]` umstellen. Neue Signatur ohne die drei Roh-Arrays.
- Weil sonst niemand die drei Collections nutzt, fallen im selben Schritt **`oparlMeetings`/`oparlAgendaItems`/`oparlConsultations`** aus `content.config.ts` **und** die komplette Props-Durchschleifung in `_helpers.ts` (inkl. der 5 reinen Durchlauf-Seiten) weg.

**Schritt B — paper-index konsumieren + `fetch-oparl` entfernen:**
- `papers/index.astro` + `getRecentMainPapers` auf `data/paper-index.json` umstellen (3-Monats-Filter bleibt im Build). Damit fällt die 4. Collection `oparlPapers` weg.
- **Erst jetzt**, wenn keine Collection mehr Roh-OParl liest, `fetch-oparl` aus `prebuild`/`predev` (`astro/package.json`), `netlify.toml` und dem lokalen Dev-Setup entfernen — **gebündelt mit Schritt B**, kein separater dritter Schritt. Zielkriterium der Karte ist am Ende von B erfüllt.

**Umstiegs-Absicherung:** Je Schritt eine **einmalige, wegwerfbare Paritätsprüfung** gegen den alten Roh-Pfad, **bevor** die Roh-Collections als Referenz verschwinden (`getPaperId`-Parität über alle Sitzungen; `getRecentMainPapers`-Parität für paper-index). Als temporäres Verifikations-Skript / manueller Diff-Abgleich, **nicht** als dauerhafter Test — der dauerhafte Schutz kommt aus der fail-fast-Validierung (Abschnitt 5).

## 7. Zu aktualisierende Dokumentation (Teil der Umsetzung)

- **`docs/guides/HOWTO.md`** — „Mandatory processing order" um `generate-oparl-derivatives` (Position 2 neben `generate-paper-assets`) ergänzen; `deno run`- und Docker-Aufruf dokumentieren; Hinweis, dass die Derivate committet werden und der Web-Build keine Roh-OParl mehr braucht.
- **`docs/arc42/`** — Datenfluss/Bausteinsicht: Astro-Build liest committete Derivate statt `data/oparl-magdeburg/`; neuer Precompile-Baustein; `fetch-oparl` nicht mehr Teil des Web-Builds.
- **`astro/CLAUDE.md`/Root-`CLAUDE.md`** ggf. anpassen, falls der Datenfluss dort beschrieben ist (Abschnitt „Data Flow").

## 8. Zusammengefasste Änderungsliste (Umsetzung)

**Neu:**
- `astro/src/models/oparl-derivatives.ts` (Typen + Zod-Schemata)
- `src/deps/astro/oparl-derivatives.ts` + Eintrag in `src/deps/astro/deno.json`
- `src/scripts/generate-oparl-derivatives/` (Deno-Generator)
- `docker/generate-oparl-derivatives.Dockerfile`
- Validierungsmodul (cross-file) + Build-Hook in `astro/astro.config.mjs`
- Committete Daten: `data/{period-id}/voting-paper-map.json`, `data/paper-index.json`

**Geändert:**
- `astro/src/content.config.ts` (Roh-Collections → 2 Derivat-Collections mit echten Zod-Schemata)
- `astro/src/pages/pp/[parliamentPeriodId]/_helpers.ts` (Props-Durchschleifung raus)
- `astro/src/pages/pp/[parliamentPeriodId]/_helpers2.ts` (`getPaperId` → Lookup)
- `astro/src/pages/pp/[parliamentPeriodId]/session/[sessionId]/voting/[votingId]/index.astro`, `…/faction/[factionId]/_motions.astro` (Aufruf-Signatur)
- `astro/src/pages/papers/index.astro`, `astro/src/pages/papers/_helpers.ts`, `_models.ts` (paper-index)
- `astro/package.json` (`prebuild`/`predev` ohne `fetch-oparl`), `netlify.toml`, Dev-Setup
- `docs/guides/HOWTO.md`, `docs/arc42/`

**Entfernt (am Ende):** `fetch-oparl` aus dem Web-Build; die vier Roh-Collections.

## 9. Empfohlener Zuschnitt des Umsetzungs-Folge-Issues

**Ein** Umsetzungs-Issue mit **drei sequenziellen PRs** (die Migrationsschritte A/B teilen eine gemeinsame Foundation):

- **PR 0 — Foundation & Derivate erzeugen:** Modelle + Zod-Schemata, Generator-Skript, Dockerfile, HOWTO-Eintrag; Generator laufen lassen → `voting-paper-map.json`/`paper-index.json` committen. **Keine** Astro-Konsum-Änderung. Danach existieren die Derivate im Repo.
- **PR A — Schritt A:** Derivat-Collection `voting-paper-map` (Zod) + cross-file-Validierungsmodul/Build-Hook; `getPaperId` → Lookup; 3 Roh-Collections + Props-Durchschleifung raus; Paritätsprüfung.
- **PR B — Schritt B:** Collection `paper-index` (Zod); `papers/index.astro`/`getRecentMainPapers` umstellen; `oparlPapers` raus; `fetch-oparl` aus Web-Build entfernen; Paritätsprüfung; arc42-Update. **Zielkriterium erfüllt.**

Begründung: Die gemeinsame Foundation (Modelle/Generator/Validierung) wird einmal gelegt; A und B sind danach klein, sequenziell und einzeln verifizierbar. Ein einzelnes Issue hält die Foundation zusammen; die drei PRs geben schrittweise Verifizierbarkeit.
