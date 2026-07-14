# Client-Darstellung des Abstimmungen-Tabs (Alpine)

Ticket: [#452](https://github.com/JensWinter/StadtratWatch-web/issues/452) · Map: [#448](https://github.com/JensWinter/StadtratWatch-web/issues/448)

Baut auf: Architektur [#449](https://github.com/JensWinter/StadtratWatch-web/issues/449) (eigenes, lazy geladenes CloudFront-Asset), Cross-Period [#450](https://github.com/JensWinter/StadtratWatch-web/issues/450) (Drucksache kann Abstimmungen in mehreren Wahlperioden haben) und Schema [#451](https://github.com/JensWinter/StadtratWatch-web/issues/451) (`PaperVotingsDto` / `PaperVotingItem`).

## Kurzfassung

Der neue Tab »Abstimmungen« auf `astro/src/pages/paper/index.astro` rendert das `PaperVotingsDto` client-seitig in Alpine als **Kartenliste** (kein Sitzungs-Timeline-Chrome — die Abstimmungen einer Drucksache stammen aus mehreren Sitzungen/Wahlperioden, nicht aus einer). Jede Karte zeigt die **getreue Fraktions-/Personen-Aufschlüsselung** der Sitzungsseite **plus** die vorberechnete Zähler-Zeile, verlinkt auf die Abstimmungs-Detailseite. Das Asset wird **eager** beim Seitenaufbau geladen.

## Getroffene Entscheidungen (Prototype + Grilling)

1. **Detailtiefe: Hybrid.** Je Abstimmung die getreuen Fraktionszeilen mit einem Statuspunkt je Person (`J`=grün, `N`=rot, `E`=gelb, sonst neutral), Hover/Tooltip = Personenname — exakt wie `_votings.astro`. **Zusätzlich** oben eine Zähler-Zeile aus `counts { J, N, E, O }` (schon im Asset vorberechnet, #451). Beide Bestandteile sind self-contained im DTO vorhanden; kein zusätzlicher Fetch.
2. **Wahlperioden-Badge: nur bei Cross-Period.** Das »WP n«-Badge je Abstimmung wird **nur** angezeigt, wenn die Drucksache Abstimmungen aus mehr als einer Wahlperiode hat (der 108-Paper-Fall aus #450, per `new Set(votings.map(v => v.parliamentPeriodId)).size > 1`). Im Normalfall (eine Periode) entfällt es → weniger Rauschen.
3. **Ladeverhalten: eager beim Seitenaufbau.** Das paper-votings-Batch-Asset wird zusammen mit den Paper-Daten in `init()` geladen (analog `papers-*.json` / `paper-graphs-*.json` heute). Damit ist der **disabled-wenn-leer**-Zustand des Tabs sofort korrekt — kein separater Existenz-Check nötig, ein zusätzlicher Fetch pro Seitenaufruf. Bei fehlendem Batch/Eintrag (404 oder `find` = undefined): Tab **disabled**, keine Fehlermeldung (leer == kein Tab-Inhalt, identisch zu »Zugehörige Drucksachen«).

## Tab-Verhalten (aus der Map bereits entschieden)

- **Label:** »Abstimmungen«.
- **Deaktiviert wenn leer:** `x-bind:disabled` analog zum Tab »Zugehörige Drucksachen«, gebunden an `paperVotings.length === 0`.
- **Sortierung:** neueste zuerst — der Generator liefert bereits sortiert (`sessionDate` desc, `votingId` asc, #451). Client rendert nur.

## Aufbau je Abstimmungskarte

Standalone Karte (`bg-base-100`, `border`, `rounded-box`), als `<a>` verlinkt auf `/pp/{parliamentPeriodId}/session/{sessionId}/voting/{votingId}` — die ganze Karte klickbar, `hover:bg-base-200` wie die Voting-Box auf der Sitzungsseite.

**Kopf** (klein, `text-base-content/70`):
- Perioden-Badge (nur cross-period, s.o.)
- Datum (`date`, `formatDate`), Sitzungs-Hinweis
- `agendaItem` (»TOP 12.6«) und `type` als `badge badge-neutral badge-sm` (wenn `type !== ''`)
- Ergebnis-Pill: angenommen (`badge`/Pill grün, `accepted === true`) / abgelehnt (rot)

**Titel:** `title` (OCR) in `text-base`.

**Zähler-Zeile:** `counts.J` Ja / `counts.N` Nein / `counts.E` Enth. / `counts.O` — (mit `text-success`/`text-error`/`text-warning`/`text-base-content/60`).

**Aufschlüsselung:** `votesByFactions` (bereits sortiert: Fraktionen nach Sitzen absteigend, Stimmen J,N,E,sonst). Je Fraktion eine Zeile `factionName:` + Statuspunkte. Markup 1:1 aus `_votings.astro` (Zeilen 153–175) übernehmbar, aber in Alpine-`<template x-for>` statt Astro-`.map()` neu geschrieben; DaisyUI-Klassen (`status status-lg`, `status-success/-error/-warning`, `tooltip`/`data-tip`) identisch wiederverwendbar.

## Nachbau aus SSR: was wiederverwendbar ist

`_votings.astro` ist eine **SSR-Astro-Komponente** — kein direkter Import in die client-gerenderte Alpine-Seite möglich. Wiederverwendbar:

- **Markup + Tailwind/DaisyUI-Klassen** der Fraktions-/Personen-Darstellung: 1:1, nur Syntax von Astro-`.map()` → Alpine-`x-for`.
- **`getVotesByFactions`-Logik** wird **nicht** im Client gebraucht — sie läuft bereits im Deno-Generator (#451) und liegt fertig als `votesByFactions` im Asset.
- **Nicht** übernommen: das `timeline`-Chrome (`<ul class="timeline">`, Lead/Trailing-`<hr>`, mittlerer Icon-Knoten) und der »Nur Sachbeschlüsse«-Filter (#451 Entscheidung 2 — kein Filter auf dem Tab; wenige Abstimmungen je Drucksache).

## Client-Skizze

```js
// in Alpine data('paper'), zusätzlich zu paper/paperTree:
paperVotings: [] as PaperVotingItem[],
showPeriodBadge: false,

// in init(), nach dem Laden des Papers (eager):
const pvBatchNo = `${Math.floor(paperId / 100)}`.padStart(4, '0');
try {
  const res = await fetch(`${AWS_CLOUDFRONT_BASE_URL}/web-assets/paper-votings/paper-votings-${pvBatchNo}.json`);
  if (res.ok) {
    const batch = (await res.json()) as PaperVotingsDto[];
    const entry = batch.find((e) => e.paperId === paperId);
    this.paperVotings = entry?.votings ?? [];
  }
} catch { /* Tab bleibt disabled */ }
this.showPeriodBadge = new Set(this.paperVotings.map((v) => v.parliamentPeriodId)).size > 1;
```

```html
<input role="tab" class="tab" aria-label="Abstimmungen" type="radio" name="paper-tabs-radio"
       x-bind:disabled="paperVotings.length === 0" />
<div class="tab-content border-base-200 bg-base-100 p-6">
  <template x-for="voting in paperVotings" :key="voting.parliamentPeriodId + voting.sessionId + voting.votingId">
    <a :href="`/pp/${voting.parliamentPeriodId}/session/${voting.sessionId}/voting/${voting.votingId}`"
       class="card ... hover:bg-base-200"> … Kopf · Zähler · votesByFactions … </a>
  </template>
</div>
```

## Prototype

Ein Inline-UI-Mockup (Wayfinder-Prototype, throwaway) hat die zwei Varianten »getreu« vs. »ergebnis-orientiert« nebeneinander gezeigt; die Entscheidung fiel auf den **Hybrid** aus beiden. Der Prototype war ein reines Diskussions-Artefakt, kein committeter Code.
