# Namens-Audit: `OPARL_S3_BUCKET` für Nicht-OParl-Daten

Datum: 2026-09-08
Frage: Die Umgebungsvariable `OPARL_S3_BUCKET` wird an mehreren Stellen genutzt, um Daten in einen
S3-Bucket zu legen — aber nicht überall handelt es sich um OParl-Daten. Ist der Name deshalb
irreführend? Bestätigen oder widerlegen.

## Fazit

**Bestätigt.** Ein und dieselbe Variable `OPARL_S3_BUCKET` benennt denselben physischen Bucket, in
den vier verschiedene Skripte Daten schreiben — und nur **eines** davon lädt tatsächlich OParl-Daten
hoch. Konkret:

- `scrape-oparl --push` schreibt den OParl-Snapshot unter Prefix `oparl/` — **das ist OParl-Daten,
  der Name passt.**
- `generate-paper-assets --push`, `generate-paper-votings --push` und `generate-image-assets --push`
  schreiben alle unter Prefix `web-assets/…` — **das sind aufbereitete Web-Assets (Batch-JSON,
  Voting-PNGs), keine rohen OParl-Daten.** Für diese drei ist der Variablenname `OPARL_S3_BUCKET`
  sachlich falsch.

Alle vier Datenarten landen im **selben Bucket** (Default `stadtrat-watch`, `.env.sample:13`); sie
sind lediglich über Key-Prefixes (`oparl/` vs. `web-assets/…`) voneinander getrennt. Ein Bucket mit
„OParl“ im Variablennamen enthält also mehrheitlich Nicht-OParl-Inhalte. Der Name ist ein
historisches Artefakt: der Bucket existierte zuerst für den OParl-Snapshot, die Web-Asset-Publisher
kamen später hinzu und haben die bereits vorhandene Variable mitbenutzt, statt eine eigene
einzuführen (dokumentiert als bewusste Entscheidung, siehe Abschnitt 4).

## 1. Alle Fundstellen von `OPARL_S3_BUCKET`

Die Variable wird an genau zwei Stellen im Code **gelesen**, plus Doku/Beispielkonfig:

| Fundstelle | Kontext | Wozu |
|---|---|---|
| `src/scripts/scrape-oparl/env.ts:37` | `tryGetScrapeOparlPushEnv()` | Bucket für den OParl-Snapshot-Push |
| `src/scripts/shared/push-env.ts:22` | `tryGetPushEnv()` | Bucket für **alle** Web-Asset-Publisher (paper-assets, paper-votings, image-assets) |
| `.env.sample:13` | Beispielkonfig | `OPARL_S3_BUCKET=stadtrat-watch` |
| `docs/guides/HOWTO.md:137,207,303,437` | Doku | „the target bucket“ für die `--push`-Läufe und den Snapshot |
| `docs/guides/publishing-web-assets.md:61` | Doku | „Target bucket (the same bucket behind CloudFront that the OParl snapshot uses)“ |
| `docs/arc42/09-architekturentscheidungen/adr-0006-web-assets-dezentral-publizieren.adoc:37` | ADR | nennt `OPARL_S3_BUCKET` als für Web-Assets wiederverwendete Auth-Variable |
| `src/scripts/generate-paper-assets/cli.ts:67` | CLI-Hilfetext | „Requires OPARL_S3_BUCKET (the target bucket)“ |
| `src/scripts/generate-paper-votings/cli.ts:60` | CLI-Hilfetext | dito |
| `src/scripts/generate-image-assets/cli.ts:57` | CLI-Hilfetext | dito |

Nur **zwei** echte Lesestellen im Code (`scrape-oparl/env.ts:37`, `shared/push-env.ts:22`); die
zweite bedient drei verschiedene Publisher.

### Verwandte Variablen

| Variable | Fundstelle | Rolle | OParl-spezifisch? |
|---|---|---|---|
| `OPARL_S3_PREFIX` | `scrape-oparl/env.ts:38`, `fetch-oparl/env.ts:19`, `.env.sample:14` | Prefix des OParl-Snapshots (Default `oparl`, `shared/oparl/oparl-snapshot.ts:47`) | **Ja** — betrifft nur den Snapshot |
| `AWS_CLOUDFRONT_BASE_URL` | `astro.config.mjs:29`, `fetch-oparl/env.ts:13`, viele Astro-Seiten, `.env.sample:19`, `ci.yml:49` | Öffentliche CloudFront-Basis-URL für **alle** Assets (OParl + web-assets) | Nein, generisch |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | `shared/push-env.ts:26`, `.env.sample:20` | Distribution für Invalidierung — nur Web-Assets brauchen sie | Nein, generisch |
| `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | `push-env.ts:23–25`, `scrape-oparl/env.ts:39–41` | AWS-Credentials | Nein, generisch |

Auffällig: Von den Auth-Variablen trägt **nur** `OPARL_S3_BUCKET` (und `OPARL_S3_PREFIX`) das
`OPARL`-Präfix; Region, Credentials und Distribution-ID sind neutral benannt. Der Bucket-Name fällt
also als einziger aus dem sonst generischen Schema heraus.

## 2. Was jede Stelle tatsächlich hochlädt

### 2.1 `scrape-oparl --push` — OParl-Daten (Name korrekt)

`scrape-oparl/env.ts:37` liest `OPARL_S3_BUCKET`, `:38` das Prefix (Default `oparl`). Der Publisher
`scrape-oparl/oparl-s3-publisher.ts` schreibt die gehashten, gzip-komprimierten OParl-Snapshot-Blobs
unter `Key: ${prefix}/${base}.${sha}.${...}.json.gz` (`oparl-s3-publisher.ts:109–115`) plus ein
`manifest.json` unter `${prefix}/manifest.json` (`:58`). Der Snapshot-Vertrag ist dokumentiert in
`shared/oparl/oparl-snapshot.ts:2–3` („`scrape-oparl --push` writes it to S3, `fetch-oparl` reads it
back"). **→ Inhalt: rohe OParl-API-Daten unter `oparl/`. Der Variablenname passt hier.**

### 2.2 `generate-paper-assets --push` — Web-Assets (Name irreführend)

`generate-paper-assets/push.ts:53` ruft `tryGetPushEnv()` (also `OPARL_S3_BUCKET`,
`push-env.ts:22`) und setzt das Prefix fest auf `web-assets/papers` (`push.ts:14`,
`PAPER_ASSETS_PREFIX`). Hochgeladen werden Batch-JSON-Dateien `papers-*.json` / `paper-graphs-*.json`
(vom Astro-Build gelesen in `astro/src/pages/paper/index.astro:374,406`). **→ Inhalt: aufbereitete
Drucksachen-Batches, keine rohen OParl-Daten.**

### 2.3 `generate-paper-votings --push` — Web-Assets (Name irreführend)

`generate-paper-votings/push.ts:53` ruft `tryGetPushEnv()`, Prefix fest auf `web-assets/paper-votings`
(`push.ts:14`, `PAPER_VOTINGS_PREFIX`). Hochgeladen: `paper-votings-*.json` (gelesen in
`astro/src/pages/paper/index.astro:429` und den Wayfinder-Specs
`docs/wayfinder/451/452/448`). **→ Inhalt: aus Session-Scans abgeleitete Abstimmungs-Batches, keine
rohen OParl-Daten.**

### 2.4 `generate-image-assets --push` — Web-Assets (Name irreführend)

`generate-image-assets/push.ts:50` ruft `tryGetPushEnv()`, Prefix dynamisch
`web-assets/parliament-periods/${period}` (`push.ts:53`). Hochgeladen: Voting-Visualisierungs-PNGs,
öffentlich referenziert in `astro/src/components/MetaTags.astro:109`
(`…/web-assets/parliament-periods/{period}/images/votings/{session}/…png`). **→ Inhalt: generierte
PNG-Bilder, keine OParl-Daten.**

### 2.5 `fetch-oparl` — nur Lesen, kein Bucket-Name nötig

`fetch-oparl/env.ts` nutzt gar nicht `OPARL_S3_BUCKET`, sondern nur `AWS_CLOUDFRONT_BASE_URL` (`:13`)
und `OPARL_S3_PREFIX` (`:19`) — es liest den Snapshot über die öffentliche CloudFront-URL zurück,
ohne Credentials (`env.ts:8–11` Kommentar). Damit ist `fetch-oparl` für die Namensfrage neutral.

## 3. Bucket-vs.-Prefix-Analyse

Es gibt **einen** Bucket (`.env.sample:13`, Default `stadtrat-watch`), hinter **einer** CloudFront-
Distribution. Die Trennung der Inhalte erfolgt ausschließlich über Key-Prefixes:

```
s3://<OPARL_S3_BUCKET>/
├── oparl/                                  ← scrape-oparl --push (ROHE OPARL-DATEN)
│   ├── <typ>.<sha>.json.gz
│   └── manifest.json
└── web-assets/                             ← die drei Web-Asset-Publisher (KEINE OParl-Daten)
    ├── papers/papers-*.json                ← generate-paper-assets
    ├── papers/paper-graphs-*.json          ← generate-paper-assets
    ├── paper-votings/paper-votings-*.json  ← generate-paper-votings
    └── parliament-periods/{period}/images/votings/{session}/*.png  ← generate-image-assets
```

Die Prefixes namespacen die Daten sauber (`oparl/` vs. `web-assets/…`), sodass es kein technisches
Problem gibt — die Publisher pflegen ihren jeweiligen Prefix als autoritatives Set und pruneen nur
Waisen **innerhalb** ihres Prefix (`web-asset-publisher.ts:100`, `verifyWebAssets` :164). Das
Namensproblem ist rein semantisch: Der Variablenname suggeriert „Bucket für OParl-Daten“, obwohl der
Bucket zu großen Teilen `web-assets/` enthält. Prefix-Trennung heilt die falsche Benennung der
Bucket-Variable nicht.

## 4. Ist der Name historisch/bewusst so?

Ja, dokumentiert. `shared/push-env.ts:2–3` sagt explizit: „The bucket is the **same one the OParl
snapshot uses** (`OPARL_S3_BUCKET`)“. `docs/guides/publishing-web-assets.md:61` beschreibt sie als
„the same bucket behind CloudFront that the OParl snapshot uses“.
`adr-0006-web-assets-dezentral-publizieren.adoc:37` hält fest, dass die Web-Asset-Publisher die
Authentifizierung „wie bei `scrape-oparl --push`" übernehmen und dabei `OPARL_S3_BUCKET`
wiederverwenden. Die Wiederverwendung war also eine bewusste Entscheidung (Bucket teilen, keine neue
Variable) — der irreführende Name ist die Nebenwirkung dieser Entscheidung, nicht ein Versehen.

## 5. Refactor-Überlegung

Ein Umbenennen (z. B. `AWS_S3_BUCKET` oder `WEB_ASSETS_BUCKET` / `ASSETS_S3_BUCKET`) wäre inhaltlich
gerechtfertigt, da drei von vier Schreibpfaden Nicht-OParl-Daten betreffen und die übrigen
Auth-Variablen bereits neutral heißen. Betroffen wären beim Umbenennen:

- **Code (2 Lesestellen):** `scrape-oparl/env.ts:37`, `shared/push-env.ts:22`.
- **Beispielkonfig:** `.env.sample:13`.
- **CLI-Hilfetexte:** `generate-paper-assets/cli.ts:67`, `generate-paper-votings/cli.ts:60`,
  `generate-image-assets/cli.ts:57`.
- **Doku:** `docs/guides/HOWTO.md:137,207,303,437`, `docs/guides/publishing-web-assets.md:61`,
  `adr-0006-….adoc:37`.
- **Laufzeit-Umgebung der Maintainer:** die lokal/als Secret gesetzte Variable beim `--push`-Lauf.

Wichtig für die Risikoabschätzung: `OPARL_S3_BUCKET` ist **kein CI-Secret**. Die CI setzt in
`ci.yml:47–53` nur `AWS_CLOUDFRONT_BASE_URL` (öffentliche URL) und Typesense-Werte; der Push ist ein
maintainer-vorbehaltener lokaler Schritt (siehe auch die Memory-Notiz „Web assets published
manually“ und die `--push`-Beschreibung in `push-env.ts:16–18`). Ein Umbenennen bräche also weder den
Netlify-/CI-Build noch bestehende Repository-Secrets — nur die lokale `.env` der Maintainer müsste
den neuen Namen tragen. `OPARL_S3_PREFIX` hingegen ist zu Recht OParl-spezifisch (nur der Snapshot
nutzt es) und sollte nicht mit umbenannt werden.

Zu beachten: Die Web-Asset-Publisher setzen ihr Prefix (`web-assets/…`) fest im Code
(`push.ts:14` bzw. `:53`); `OPARL_S3_PREFIX` wird von ihnen nicht gelesen. Eine saubere Variante wäre
daher, `push-env.ts` (Web-Assets) und `scrape-oparl/env.ts` (Snapshot) je eine passend benannte
Bucket-Variable geben zu lassen — sie zeigen aktuell zwar auf denselben Bucket, müssen es aber
technisch nicht.

## Quellenverzeichnis (jede Aussage belegt)

- Bucket-Lesestellen: `src/scripts/scrape-oparl/env.ts:37`, `src/scripts/shared/push-env.ts:22`
- Default-Bucket/Prefix: `.env.sample:13–14`
- Snapshot-Prefix-Default `oparl`: `src/scripts/shared/oparl/oparl-snapshot.ts:47`
- OParl-Snapshot-Keys: `src/scripts/scrape-oparl/oparl-s3-publisher.ts:58,109–115`; Vertrag `oparl-snapshot.ts:2–3`
- paper-assets Prefix/Push: `src/scripts/generate-paper-assets/push.ts:14,49–61`; Web-Konsum `astro/src/pages/paper/index.astro:374,406`
- paper-votings Prefix/Push: `src/scripts/generate-paper-votings/push.ts:14,49–62`; Web-Konsum `astro/src/pages/paper/index.astro:429`, `docs/wayfinder/451-,452-,448-*.md`
- image-assets Prefix/Push: `src/scripts/generate-image-assets/push.ts:50–58`; Web-Konsum `astro/src/components/MetaTags.astro:109`
- fetch-oparl nutzt keinen Bucket-Namen: `src/scripts/fetch-oparl/env.ts:8–19`
- gemeinsamer Bucket bewusst: `src/scripts/shared/push-env.ts:2–3`, `docs/guides/publishing-web-assets.md:61`, `adr-0006-web-assets-dezentral-publizieren.adoc:37`
- Prefix-Isolierung/Pruning: `src/scripts/shared/web-asset-publisher.ts:100,159–178`
- kein CI-Secret: `.github/workflows/ci.yml:47–53`
- Docker `fetch-oparl` nutzt nur `AWS_CLOUDFRONT_BASE_URL,OPARL_S3_PREFIX`: `docker/fetch-oparl.Dockerfile:20`
