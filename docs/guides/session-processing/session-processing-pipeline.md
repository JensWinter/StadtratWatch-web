# Verarbeitungs-Pipeline einer neuen Stadtratssitzung

Dieses Dokument beschreibt **lückenlos**, wie aus einer neuen Stadtratssitzung die
ausgelieferten Daten auf StadtratWatch entstehen — von der Vorbereitung bis zur
Veröffentlichung. Es erfasst **automatisierte**, **halb-automatisierte** und
**manuelle** Schritte, benennt für jeden Schritt **Datenquellen und Datensenken**
und macht deutlich, **was wann durch wen** geschieht.

- **Grafische Darstellung:** zwei Diagramme in separaten Dateien:
  [`session-processing-overview.puml`](./session-processing-overview.puml)
  (chronologischer Gesamtablauf) und
  [`session-processing-dataflow.puml`](./session-processing-dataflow.puml)
  (Datenquellen und Datensenken).
- **Bedienungsanleitung mit konkreten Befehlen:** [`HOWTO.md`](../HOWTO.md) und
  [`processing-council-meeting.md`](../processing-council-meeting.md).
- **Architektur-Einordnung:** arc42-Laufzeitsicht in
  [`docs/arc42/06-laufzeitsicht/`](../../arc42/06-laufzeitsicht/index.adoc) (Szenarien 6.1–6.4).

> Dieses Dokument ist die **fachliche Ablaufübersicht** und die Quelle der
> Wahrheit für die *Reihenfolge* und *Verantwortlichkeiten*. Die exakten
> CLI-/Docker-Befehle stehen bewusst nur in `HOWTO.md`, damit sie nicht
> doppelt gepflegt werden müssen.

---

## Legende

### Automatisierungsgrad

| Symbol | Bedeutung |
|--------|-----------|
| 🤖 **automatisch** | Skript/Build läuft ohne menschliches Eingreifen (aber manuell angestoßen bzw. durch Push getriggert). |
| 🧑‍🔧 **halb-automatisch** | Skript erzeugt einen Rohbestand, den ein Mensch anschließend sichtet/korrigiert. |
| ✋ **manuell** | Rein menschliche Tätigkeit (Screenshots, Zuordnung, Freigabe, Publizieren). |

### Akteure

| Akteur | Rolle |
|--------|-------|
| **Maintainer:in** | Führt alle Pipeline-Schritte bedarfsweise am lokalen Arbeitsplatz aus, sichtet, korrigiert, gibt frei, publiziert. Es gibt **keinen Scheduler** — der Anstoß liegt in menschlicher Hand. |
| **scan-check-ui** | **Externes** Prüfwerkzeug (nicht Teil dieses Repos) für die manuelle Sichtung/Korrektur der Abstimmungsdaten und die Zuordnung der Sprecher:innen-Segmente. |
| **Externe Dienste** | YouTube (Video), HuggingFace (pyannote-Modell), OpenAI Whisper (Transkription), OParl-API (Parlamentsdaten). |
| **Netlify** | Baut und liefert die statische Website — **automatisch** bei jedem Push auf `main`. |

### Datenablagen (Datensenken)

| Ablage | Inhalt | Versioniert? |
|--------|--------|--------------|
| **Git-Repo** (`data/`) | Freigegebene, ausgelieferte JSON-Daten: `registry.json`, `session-scan-*.json`, `session-speeches-*.json`, OParl-Derivate. | ✅ Git |
| **S3 »stadtrat-watch«** | Aktiv genutzte **Zwischenartefakte**: Configs, Roh-Screenshots, RTTM, anonyme und redaktionell geprüfte (`*-redacted`) Zwischenstände. | ❌ |
| **S3/CloudFront (`web-assets/`)** | Große Binär-/Auslieferungs-Assets: Abstimmungs-PNGs, `paper-votings`, Drucksachen-Batches (`papers/`). | ❌ |
| **S3/CloudFront (`oparl/`)** | OParl-Rohdaten-Snapshot: inhaltsadressierte, unveränderliche Blobs (`<datei>.<sha>.json.gz`) + kleine `manifest.json`. | ❌ |
| **Typesense (VPS)** | Volltext-Suchindex (`papers`, `speeches`). | ❌ |
| **Netlify** | Ausgelieferte statische Website + API v1. | ❌ (Build-Artefakt) |
| **lokal** (`output/`, `sessions-media-files/`) | Nur Arbeitsartefakte während der Verarbeitung (Video, Audio, MP3-Ausschnitte, Roh-Outputs). | ❌ |

---

## Gesamtablauf (Übersicht)

Die Sitzungsverarbeitung besteht aus **drei unabhängigen Zweigen**, die parallel
laufen können und über die Datenablage entkoppelt sind, gefolgt von einer
**Zusammenführung** und der **Veröffentlichung**:

- **Zweig A — Abstimmungen (OCR):** Screenshots der Abstimmungstafeln → OCR →
  menschliche Prüfung → `session-scan-*.json`.
- **Zweig B — Reden (Audio):** Tonspur → Diarisierung → Sprecher-Zuordnung →
  Transkription → Prüfung → `session-speeches-*.json`.
- **Zweig C — OParl/Drucksachen:** OParl-Abruf → PDFs → Drucksachen-Assets →
  Build-Derivate → Volltext.
- **Zusammenführung:** Bild-Assets, Paper-Votings, Suchindex.
- **Veröffentlichung:** Freigabe → Push → Netlify-Build.

> Das vollständige, gerenderte Aktivitätsdiagramm steht in
> [`session-processing-overview.puml`](./session-processing-overview.puml), das
> zugehörige Datenfluss-Diagramm (Quellen/Senken) in
> [`session-processing-dataflow.puml`](./session-processing-dataflow.puml).

---

## Schritt für Schritt

Die Nummerierung folgt dem chronologischen Ablauf beim Onboarding **einer**
Sitzung. Die Reihenfolge **innerhalb** eines Zweigs ist zwingend; die Zweige A/B/C
sind untereinander unabhängig. Die Zusammenführungs-Schritte (17–19) setzen die
Ergebnisse der jeweils benötigten Zweige voraus.

### Phase 0 — Vorbereitung

| # | Grad | Wer | Werkzeug | Eingabe (Quelle) | Ausgabe (Senke) |
|---|------|-----|----------|------------------|-----------------|
| 1 | ✋ | Maintainer:in | Editor | Sitzungsmetadaten (Datum, YouTube-URL) | Neuer Eintrag in **`data/{periode}/registry.json`** (`approved = false`) → Git |
| 2 | ✋ | Maintainer:in | Editor | Bildlayout der Abstimmungstafeln | **`config-YYYY-MM-DD.json`** → Git (`data/{periode}/{date}/`) **und** S3 »sessions-configs« |
| 3 | ✋ | Maintainer:in | `yt-dlp` | YouTube-Video | Lokale Videodatei → `sessions-media-files/{date}/` |

### Phase A — Abstimmungs-Zweig (OCR)

| # | Grad | Wer | Werkzeug | Eingabe (Quelle) | Ausgabe (Senke) |
|---|------|-----|----------|------------------|-----------------|
| 4 | ✋ | Maintainer:in | Screenshot | Video | **Screenshots** der Tafeln (`YYYY-MM-DD-XXX.png`, chronologisch, gleich groß) → lokal **und** S3 »sessions-raw/{date}« |
| 5 | 🧑‍🔧 | Skript | **`scan-voting-images`** (Deno + Tesseract) | Screenshots + `config-*.json` | **`session-scan-{date}.json`** (roh) → S3 »sessions-scan-results« |
| 6 | ✋ | Maintainer:in | **`scan-check-ui`** (extern) | rohe `session-scan` + Video | Geprüfte **`session-scan-{date}.json`** (Voten, TOPs, Drucksachennummern) → S3 »sessions-scan-results-redacted« **und** Git (`data/{periode}/{date}/`) |

> **Korrektur-Iteration (Phase A):** Reicht die Korrektur in `scan-check-ui` nicht,
> wird die **Scan-Config angepasst** und `scan-voting-images` erneut ausgeführt,
> oder die JSON **direkt editiert**. OCR-Fehler werden **bewusst nicht automatisch**
> korrigiert, sondern hier menschlich behoben (Qualitätsziel #2).

### Phase B — Rede-Zweig (Audio)

| # | Grad | Wer | Werkzeug | Eingabe (Quelle) | Ausgabe (Senke) |
|---|------|-----|----------|------------------|-----------------|
| 7 | 🤖 | Skript | **`ffmpeg`** (Shell) | Videodatei | Einkanaliges Audio (`audio.wav`/`.mp3`), ggf. gesplittet → lokal |
| 8 | 🤖 | Skript | **`speaker-diarization`** (Python, pyannote; HuggingFace-Token) | Audiodatei | **RTTM**-Datei (anonyme Sprecher-Segmente) → S3 »sessions-speakers« |
| 9 | 🤖 | Skript | **`parse-speakers`** (Deno) | RTTM-Datei(en) | **`session-speakers-{date}.json`** (anonym) → S3 »sessions-speakers« |
| 10 | ✋ | Maintainer:in | **`scan-check-ui`** (extern) | `session-speakers` + Audio | **`session-speeches-{date}.json`** (Segmente zugeordnet, ohne Transkript) → S3 »sessions-speakers-redacted« |
| 11 | ✋ | Maintainer:in | `scan-check-ui` / Editor | `session-speeches` (Segmente) | Fachlich gesichtete Reden (Vorsitz/Ortsbürgermeister:in/Kommission markiert, Rauschen entfernt) → S3 »sessions-speeches-redacted« |
| 12 | 🤖 | Skript | **`extract-speeches`** (Shell, ffmpeg) | Audio + `session-speeches` | Eine **MP3 je Redebeitrag** → lokal `output/speeches/{date}/` |
| 13 | 🤖 | Skript | **`speech-to-text`** (Deno, OpenAI Whisper) | `session-speeches` + MP3s | `session-speeches-{date}.json` **mit Transkript** → S3 »sessions-speeches-with-transcriptions« |
| 14 | ✋ | Maintainer:in | Editor | transkribierte `session-speeches` | Korrigierte Transkription → S3 »sessions-speeches-with-transcriptions« **und** Git (`data/{periode}/{date}/session-speeches-{date}.json`) |

### Phase C — OParl-/Drucksachen-Zweig (unabhängig)

| # | Grad | Wer | Werkzeug | Eingabe (Quelle) | Ausgabe (Senke) |
|---|------|-----|----------|------------------|-----------------|
| 15a | 🤖 | Skript | **`scrape-oparl`** (Deno) | OParl-API der Stadt | OParl-Rohdaten → lokal `data/oparl-magdeburg/` (**nicht** committed) **und** S3/CloudFront (oparl-Snapshot). Auf anderen Rechnern via `fetch-oparl` beziehbar. |
| 15b | 🤖 | Skript | **`download-paper-files`** (Deno) | Datei-Verweise aus OParl | PDF-Dokumente → lokal `output/papers/{jahr}/` |
| 15c | 🤖 | Skript | **`generate-paper-assets`** (Deno) | OParl-Rohdaten + PDF-Dateigrößen + Registries | Drucksachen-**JSON-Batches** → lokal `output/paper-assets/`, mit `--push` nach S3/CloudFront (`web-assets/papers/`) |
| 15d | 🤖 | Skript | **`generate-oparl-derivatives`** (Deno) | OParl-Rohdaten + `registry.json` | **`data/paper-index.json`** + **`data/{periode}/voting-paper-map.json`** → Git (die **einzigen** OParl-Eingaben des Builds) |
| 15e | 🤖 | Skript | **`tika-batch-extract`** (Docker/Tika) | PDF-Dokumente | Extrahierter Volltext → lokal `output/papers/{jahr}-extracted/` |

### Phase D — Zusammenführung (Assets & Suche)

| # | Grad | Wer | Werkzeug | Eingabe (Quelle) | Ausgabe (Senke) |
|---|------|-----|----------|------------------|-----------------|
| 16 | 🤖 | Skript | **`generate-image-assets`** (Deno) | `session-scan-{date}.json` + `registry.json` | Abstimmungs-**PNGs** (`{date}-{voting}.png`) → lokal `output/image-assets/{periode}/`, mit `--push` nach S3/CloudFront (`web-assets/parliament-periods/{periode}/`) |
| 17 | 🤖 | Skript | **`generate-paper-votings`** (Deno) | `voting-paper-map.json` (15d) + `session-scan-{date}.json` (6) | **`paper-votings-*.json`** → lokal `output/paper-votings/`, mit `--push` nach S3/CloudFront (`web-assets/paper-votings/`) |
| 18 | 🤖 | Skript | **`index-search`** (Deno) | OParl-Rohdaten-Metadaten (15a) + extrahierter Volltext (15e) + `session-speeches-{date}.json` (14) | Befüllte **Typesense**-Collections (`papers`, `speeches`) → VPS |

### Phase E — Freigabe & Veröffentlichung

| # | Grad | Wer | Werkzeug | Eingabe (Quelle) | Ausgabe (Senke) |
|---|------|-----|----------|------------------|-----------------|
| 19 | ✋ | Maintainer:in | Editor | geprüfte Sitzungsdaten | **`approved = true`** in `registry.json` → Git |
| 20 | ✋ | Maintainer:in | `git` | committete `data/`-Änderungen | Push auf **GitHub `main`** |
| 21 | 🤖 | Netlify | Astro-Build | committete Daten (`data/`, nur Derivate für OParl) | Statische Website + API v1 → **Netlify** (automatisch bei Push) |

---

## Zeitliche Einordnung — „Was passiert wann durch wen?"

- **Anstoß:** Es gibt **keinen Scheduler**. Jede Skript-Stufe wird von der
  **Maintainer:in** bedarfsweise am lokalen Arbeitsplatz gestartet (nativ oder
  containerisiert, siehe `docker/`). Nur der **Netlify-Build (21)** ist ein echter
  Automatismus — ausgelöst durch den Push (20).
- **Parallelität:** Die Zweige **A**, **B** und **C** sind voneinander unabhängig.
  Schlägt einer fehl, bleiben die Ergebnisse der anderen nutzbar (Entkopplung über
  Dateien). Jede Stufe ist **wiederholbar** ohne Seiteneffekte.
- **Mensch im Loop:** Die qualitätssichernden Schritte **6, 10, 11, 14** und die
  **Freigabe (19)** sind bewusst manuell. `approved` ist ein **Anzeige-Status**,
  **kein Veröffentlichungs-Gate**: Auch unbestätigte Sitzungen sind sichtbar, dann
  aber als *vorläufig* gekennzeichnet (arc42 Szenario 6.4).
- **Zwei getrennte S3-Ziele:** Der Bucket **»stadtrat-watch«** hält die
  *Zwischenartefakte* (Configs, Roh-Screenshots, RTTM, `*-redacted`), das
  **web-assets**-Ziel (S3/CloudFront) hält die *ausgelieferten* Binär-Assets. Nur
  Letzteres wird von der Website zur Laufzeit geladen.
- **Kein separater Publish-Schritt mehr:** Die drei Generatoren
  (`generate-paper-assets`, `generate-image-assets`, `generate-paper-votings`)
  publizieren ihre Web-Assets in Phase D **direkt per `--push`** — es gibt keinen
  nachgelagerten manuellen Upload über die AWS-Konsole. Der Push ist ein bewusster
  Maintainer-Schritt (er braucht AWS-Zugangsdaten), aber Teil des Generatorlaufs.
  Details in [`publishing-web-assets.md`](../publishing-web-assets.md).

## Fehler- und Sonderfälle

- **OCR-Fehlerkennung** (Zweig A): fehleranfällig durch Bildqualität; wird nicht
  automatisch, sondern in Schritt 6 menschlich korrigiert.
- **Ausfall externer Dienste** (YouTube, OpenAI, HuggingFace, OParl): Jede Stufe
  arbeitet auf Dateien und ist wiederholbar; ein fehlgeschlagener Schritt kann
  gefahrlos erneut laufen. Eine spätere Löschung/Verschiebung des YouTube-Videos
  bleibt ein akzeptiertes Restrisiko (arc42 R2).
- **Große Audiodateien** (> 5 h): vor der Diarisierung in Segmente splitten
  (`ffmpeg -f segment`, siehe `processing-council-meeting.md`).
- **Fehlgeschlagener Build:** Ein Build, der wegen inkonsistenter Daten scheitert,
  veröffentlicht nichts Neues — der bisherige Stand bleibt bestehen.

## Verweise

- Befehle & Docker-Images: [`HOWTO.md`](../HOWTO.md) (maßgebliche, aktuelle Referenz;
  enthält u. a. die **zwingende Verarbeitungsreihenfolge**).
- Detail-Runbook mit Beispielen: [`processing-council-meeting.md`](../processing-council-meeting.md).
- web-assets publizieren: [`publishing-web-assets.md`](../publishing-web-assets.md).
- Architektur (Laufzeit, Datengewinnung, Datenhaltung):
  [`docs/arc42/`](../../arc42/index.adoc), insbesondere Szenarien 6.1–6.4 und
  Kapitel 8.
