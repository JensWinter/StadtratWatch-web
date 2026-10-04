# Pangram-API-Vertrag für die KI-Einschätzung deutscher Transkripte

Datum: 2026-10-04
Ticket: [#504](https://github.com/JensWinter/StadtratWatch-web/issues/504) der Wayfinder-Karte
[#501](https://github.com/JensWinter/StadtratWatch-web/issues/501)
Frage: Wie sieht der Pangram-API-Vertrag aus, den `detect-ai-text` implementieren und das Modell
`AiTextAssessment` abbilden muss?

Quellen (Primärquellen, Stand 2026-10-04):

- [API-Referenz AI Detection](https://docs.pangram.com/api-reference/ai-detection) (im Folgenden *API-Ref*)
- [API Overview / Fehlercodes](https://docs.pangram.com/api-reference/introduction), [REST-Quickstart](https://docs.pangram.com/quickstart-rest)
- [Models-Endpoint](https://docs.pangram.com/api-reference/models), [Bulk API](https://docs.pangram.com/api-reference/bulk-api), [Python SDK](https://docs.pangram.com/sdk/python)
- [Pangram-4-Migrationsguide](https://www.pangram.com/blog/pangram-4-migration-guide), [v3-Migrationsguide](https://www.pangram.com/blog/v3-api-migration-guide)
- [Pangram 4 Model Card](https://www.pangram.com/research/model-card/pangram-4), [Pangram 3.1 Model Card](https://www.pangram.com/research/model-card/pangram-3-1)
- [Pangram 4 Tech Report (arXiv 2607.27183)](https://arxiv.org/html/2607.27183v1) (im Folgenden *Tech Report*)
- [API-Produktseite](https://www.pangram.com/solutions/api), [Pricing](https://www.pangram.com/pricing), [Research Credits](https://www.pangram.com/contact-us/research)
- [Knowledge Hub: Min/Max Input](https://www.pangram.com/knowledge-hub/minimum-and-maximum-input-sizes), [Blog: Mindestwortzahl](https://www.pangram.com/blog/why-does-pangram-have-a-minimum-word-count), [Blog: Multilingual (2024, „Unsupported Language“)](https://www.pangram.com/blog/pangram-text-multilingual)

## Fazit (Kurzfassung)

1. **Ein** asynchroner Endpoint (`POST /task` → `GET /task/{id}`), Modell explizit `"pangram-4"`, Antwort-`version` = `"4.0"`.
   Dokumentweit: `prediction_short ∈ {AI, Mixed, Human}` + drei Anteile; pro Fenster: Label, `confidence ∈ {High, Medium, Low}`, Score.
2. **Es gibt keine dokumentweite Konfidenz.** `confidence` existiert nur pro Fenster und misst die „Spitzigkeit“ der
   Modell-Posterior, nicht die Fehlalarmwahrscheinlichkeit. „High-Confidence AI/Mixed“ pro Redebeitrag muss
   abgeleitet werden; Vorschlag: **schwächstes-Glied-Regel** (Abschnitt 2).
3. Mindestens 50 Wörter (vorab clientseitig prüfen, Verhalten darunter nicht dokumentiert); Deutsch offiziell
   unterstützt (FPR 0,0026 %); lange Texte chunkt Pangram intern — Redebeiträge **nie** selbst splitten.
4. 5 QPS Realtime, HTTP 429 darüber; kein dokumentiertes Polling-Intervall (SDK: 0,5 s, Timeout 300 s).
   Für 10–50 Texte reicht `/task` sequenziell; Bulk ist 20 % günstiger, aber mehr Aufwand.
5. Die 2.000 Wörter/Tag des Free-Plans sind das **Dashboard-Kontingent**; API-Aufrufe werden aus **Prepaid-Credits**
   bezahlt (ab 25 $; 402 ohne Guthaben). Research-Programm: 200.000 Credits kostenlos, 3 Monate gültig.
6. Zusammenfassung speichert: Label, drei Anteile, Segmentzahlen, **wortgewichtete Konfidenzverteilung der
   nicht-menschlichen Fenster**, Modell-Selektor + `version`, Prüfdatum, Hash des geprüften Texts, Regelversion
   (Abschnitt 6, TypeScript-Skizze).

---

## 1. Request/Response des asynchronen Task-Endpoints (Pangram 4)

Basis-URL `https://text.external-api.pangram.com`, Header `x-api-key: <key>` (API-Ref, API Overview).

### Request `POST /task`

| Feld                    | Typ     | Pflicht | Bemerkung                                                                                           |
|-------------------------|---------|---------|-----------------------------------------------------------------------------------------------------|
| `text`                  | string  | ja      | Der zu prüfende Text (ggf. normalisiert; Fenster-Offsets beziehen sich auf den normalisierten Text) |
| `model`                 | string  | nein*   | Selektor, z. B. `"pangram-4"`; `"default"` = aktuelles Standardmodell ohne Pinning. *Nach 30.09.2026 laut SDK-README Pflicht; immer explizit setzen |
| `public_dashboard_link` | boolean | nein    | Default `false`; `true` erzeugt öffentlichen Link auf pangram.com (veröffentlicht den Text dort)    |

Antwort: `{ "task_id": "<uuid>" }` (REST-Quickstart). Verfügbare Selektoren: `GET /models` → `{ "models": string[] }`,
Reihenfolge serverseitig, nicht hartkodieren (Models-Endpoint).

### Response `GET /task/{task_id}`

Polling bis `stage ∈ {STAGE_SUCCESS, STAGE_FAILED}`; Zwischenstufen wie `STAGE_PREPROCESSING` möglich (readthedocs).

| Feld                        | Typ          | Werte / Semantik                                                                                     |
|-----------------------------|--------------|------------------------------------------------------------------------------------------------------|
| `task_id`                   | string       |                                                                                                      |
| `stage`                     | string       | Terminal: `STAGE_SUCCESS`, `STAGE_FAILED`                                                            |
| `version`                   | string       | API-/Modellversion, Pangram 4 → `"4.0"`. **Es gibt kein `model`-Feld in der Antwort** (API-Ref)      |
| `text`                      | string       | Der analysierte (normalisierte) Text                                                                 |
| `headline`                  | string       | Kurzzusammenfassung, z. B. `"AI Assisted"`; bei `STAGE_FAILED` trägt es die Fehlerursache            |
| `prediction`                | string       | Langform-Erklärung, z. B. „We believe that this text is a mix of …“                                  |
| `prediction_short`          | string       | **`"AI"` \| `"Human"` \| `"Mixed"`** (Pangram 4)                                                      |
| `fraction_ai`               | float 0–1    | Zeichenanteil „AI-Generated“                                                                         |
| `fraction_ai_assisted`      | float 0–1    | Zeichenanteil „AI-Assisted“                                                                          |
| `fraction_human`            | float 0–1    | Zeichenanteil „Human Written“; die drei Anteile summieren zu 1,0 (v3-Guide)                         |
| `num_ai_segments`           | integer      |                                                                                                      |
| `num_ai_assisted_segments`  | integer      |                                                                                                      |
| `num_human_segments`        | integer      |                                                                                                      |
| `dashboard_link`            | string       | Nur wenn `public_dashboard_link: true`                                                               |
| `windows`                   | Window[]     | Nicht überlappende Ausgabesegmente (s. u.); bei Fehler `[]`                                          |

`Window`:

| Feld                  | Typ        | Werte / Semantik                                                                 |
|-----------------------|------------|----------------------------------------------------------------------------------|
| `text`                | string     | Segmenttext                                                                      |
| `label`               | string     | **`"AI-Generated"` \| `"AI-Assisted"` \| `"Human Written"`** (Pangram 4; 3.x hatte `Lightly/Moderately AI-Assisted`) |
| `ai_assistance_score` | float 0–1  | Kontinuierlicher Score; **nicht** mit v2-`ai_likelihood` gleichzusetzen           |
| `confidence`          | string     | **`"High"` \| `"Medium"` \| `"Low"`**                                              |
| `start_index`, `end_index` | integer | Zeichenpositionen im zurückgegebenen (normalisierten) `text`                    |
| `word_count`, `token_length` | integer |                                                                               |
| `is_humanized`        | boolean    | Nur Pangram 4; `true`, wenn `humanizer_score ≥ 0,91` (Model Card)                |
| `humanizer_score`     | float 0–1  | Nur Pangram 4                                                                    |

Fehlerfall (API-Ref, Beispiel): `{ "stage": "STAGE_FAILED", "headline": "preprocessing: Input text contains no valid text after preprocessing", "windows": [] }`, numerische Felder 0.0/0, Strings leer. Fehler des Modells landen also **im Task-Ergebnis**, nicht als HTTP-Status.

Dokumentweite Entscheidungsregel (Model Card, Tech Report): `Human` wenn `fraction_human ≥ 0,90`, `AI` wenn `fraction_ai ≥ 0,80`, sonst `Mixed`. Anteile sind zeichenlängengewichtet.

## 2. Semantik der Konfidenz — und Ableitung pro Redebeitrag

**Befund: Die API liefert keine dokumentweite Konfidenz.** Weder API-Ref noch Model Card noch Tech Report kennen ein
Konfidenzfeld auf Dokumentebene; `confidence` gibt es ausschließlich in `windows[]`. Die Model Card definiert es als
„the model's local confidence level … computed as the mean CRF marginal assigned to the segment's final displayed
class“; der Tech Report (Abschnitt 4.3.5): „confidence measures the peakedness of the unconstrained CRF posterior“.
Die Schwellen für High/Medium/Low sind **nicht veröffentlicht**. Konfidenz ist damit ein Maß der Modellsicherheit,
**keine kalibrierte Fehlalarmwahrscheinlichkeit** — das Validierungstor der Karte bleibt unverzichtbar.

Konsequenz für Q15 der Karte („nur High-Confidence wird angezeigt“): Die Eigenschaft muss aus den Fenstern
abgeleitet werden. Vorschlag **Regel `weakest-non-human-window@1`**:

```
nonHumanWindows = windows mit label ∈ {AI-Generated, AI-Assisted}
isHighConfidenceNonHuman =
     prediction_short ∈ {AI, Mixed}
  ∧ nonHumanWindows ≠ ∅
  ∧ ∀ w ∈ nonHumanWindows: w.confidence == "High"
```

Begründung:

- Das Badge behauptet etwas über die KI-Anteile des Beitrags; nur deren Fenster sind beweistragend. Die Konfidenz der
  „Human“-Fenster ist für das Badge irrelevant.
- **Schwächstes Glied statt Mittelwert:** Ein einzelnes „Medium“-Fenster darf nicht durch wortgewichtetes Mitteln
  weggerechnet werden — die Kosten eines Fehlalarms (öffentliches Badge an einer namentlich zuordenbaren Rede)
  sind asymmetrisch hoch. Die Regel ist bewusst die konservativste der naheliegenden Varianten.
- Sie ist aus den gespeicherten Aggregaten (Abschnitt 6) ohne Fenster rekonstruierbar: Es genügt der wortgewichtete
  Anteil der nicht-menschlichen Fenster je Konfidenzstufe; die Regel entspricht `nonHumanConfidence.high == 1`.
- Alternativen, die mit denselben gespeicherten Daten später umgesetzt werden können: (a) wortgewichtet
  `nonHumanConfidence.high ≥ 0,9`; (b) zusätzlich Mindestanteil `fraction_ai + fraction_ai_assisted ≥ 0,2`, damit
  ein „Mixed“ mit 11 % KI-Anteil kein Badge erzeugt. Variante (b) ist eine Produktentscheidung für die Spec, nicht Teil
  des API-Vertrags; empfohlen, am Kontrollkorpus zu messen, welche Variante die Fehlalarmquote senkt.

## 3. Grenzfälle

- **< 50 Wörter:** Pangram 4 verlangt ≥ 50 Wörter (Model Card, Knowledge Hub, Tech Report). Welche Antwort darunter
  kommt (HTTP 422 „input text invalid“ oder `STAGE_FAILED` mit `headline`), ist **nicht dokumentiert**. Daher:
  Wortzahl **clientseitig vor dem Aufruf** prüfen, kurze Beiträge überspringen und als „nicht geprüft“ behandeln
  (kein Feld auf `SessionSpeech`); unabhängig davon jedes `STAGE_FAILED` und jeden 4xx als „nicht geprüft“ behandeln.
- **Sprache nicht erkannt:** „Unsupported Language“ als `prediction` stammt aus dem Multilingual-Blog von 2024
  (Spracherkennung via Amazon Comprehend). Für Pangram 4 ist dieser Wert **nicht** mehr dokumentiert; Deutsch gehört zu
  den 24 offiziell unterstützten Sprachen (Model Card: FPR Deutsch 0,0026 %, FNR 1,33 %). Defensiv: jeden
  `prediction_short`-Wert außerhalb `{AI, Human, Mixed}` als unbekannt behandeln und nie anzeigen.
- **Namen/Zahlen/Nicht-Prosa:** Keine Aussage in den Quellen zu eingestreuten Eigennamen oder Zahlen. Die Model Card
  nennt als Out-of-Scope: kurze Dialogantworten, Einzelfakt-Antworten, Code, Inhaltsverzeichnisse, Vorlagentext,
  Anleitungen, Mathematik. Transkribierte Reden sind Prosa in ganzen Sätzen, aber **gesprochene Sprache ist nicht
  Teil des erklärten Einsatzbereichs** (nur das ESL-Dialog-Korpus ICNALE wurde evaluiert: 1 Fehlalarm bei 5.593).
  Transkript-Füllwörter („äh“), Anreden und Zahlenreihen laufen in die Wortzählung und Normalisierung ein — ein Grund
  mehr für das Tor.
- **Sehr lange Texte:** Pangram fenstert intern (512 Token, Stride 256, 50 % Überlappung; Tech Report). API-Maximum
  nicht dokumentiert, Dashboard-Maximum 18.725 Wörter (Knowledge Hub). Redebeiträge liegen weit darunter →
  **nicht selbst chunken**; die dokumentweiten Anteile und die Entscheidungsregel setzen den ganzen Text voraus.

## 4. Rate-Limits, Fehlercodes, Polling, Bulk vs. Realtime

- **Rate-Limit:** Realtime **5 QPS** (API-Produktseite); darüber HTTP 429 „API key exceeds its configured rate limit“.
  Kein `Retry-After` dokumentiert. Höhere Limits nur Enterprise.
- **HTTP-Fehler (API Overview):** 400 Body fehlerhaft · 401 Key fehlt/ungültig · **402 kein Guthaben** · 403 Modell für
  Key nicht freigeschaltet / fremder Task · 404 Task unbekannt · 413 Bulk über Limit · 422 Text oder Modell-Selektor
  ungültig · 429 Rate-Limit · 500 · 503 Modell vorübergehend nicht verfügbar.
- **Polling:** Kein dokumentiertes Intervall. Das offizielle Python-SDK pollt mit **0,5 s** (Minimum 0,1 s) und
  Timeout **300 s**. Für Deno: 1 s Intervall, Timeout 120 s, einfaches Backoff bei 429/5xx.
- **Bulk (`POST /bulk`):** bis 1.000 abrechenbare Einheiten (= 100.000 Wörter bei Pangram 4) pro Job, Status
  `queued|running|succeeded|failed|partial`, Ergebnisse 48 h abrufbar, paginiert (`limit ≤ 1000`), ein Modell pro Job,
  20 % Rabatt. Validierungsfehler einzelner Items kommen als `failed_items[].error` schon beim Submit.
- **Empfehlung für 10–50 Texte/Lauf:** `/task` **sequenziell** (≈ 1 Request/s, weit unter 5 QPS). Einfacheres
  Fehlerhandling pro Beitrag, kein 48-h-Fenster, Ersparnis durch Bulk bei 50 Reden à ~800 Wörter ≈ 4 $ — irrelevant.
  Bulk nur erwägen, falls das Nachholen 2026 (Karte, „Not yet specified“) Hunderte Beiträge umfasst.

## 5. Free-Plan vs. Prepaid-Credits

- Free-Plan: „Scan up to 2,000 words per day“ und „Access to Pangram API“ (Pricing). Die 2.000 Wörter sind das
  **Dashboard-Kontingent**; die API-Produktseite nennt **keine** freien API-Wörter, sondern Prepaid-Credits
  (Self-Service **25 $ bis 1.000 $**, optional Auto-Refill) und 402 bei leerem Guthaben. Ob der Free-Plan irgendein
  API-Freikontingent enthält, ist **nicht dokumentiert** — nicht darauf bauen.
- Preis: **0,05 $ / 100 Wörter** (eine „billable unit“ = angefangene 100 Wörter, mindestens eine je Text),
  Bulk 0,04 $. Beispiel: 50 Reden à 800 Wörter ≈ 400 Einheiten ≈ **20 $/Lauf**; Kontrollkorpus 200 × 800 Wörter ≈ 80 $.
  25 $ Startguthaben decken ~50.000 Wörter.
- **Research-Programm:** 200.000 Credits kostenlos (1 Credit = 1 Abrechnungseinheit à 100 Wörter), weitere zu 0,025 $/Credit; Gültigkeit 3 Monate
  (verlängerbar), Antwort „typically within 24 hours“; Bedingungen: Pangram über Veröffentlichungen informieren,
  Kurzbeschreibung der Nutzung, Nennung in Social Media/Presse. Passt zum Kontrollkorpus; Antrag nicht blockierend
  (Karte), aber wegen der 3-Monats-Frist erst kurz vor dem Tor stellen.
- Professional-Plan (65 $/Monat) enthält 200 $ API-Guthaben — für dieses Volumen unnötig.

## 6. Felder der abgeleiteten Zusammenfassung (`AiTextAssessment`)

Ziel: spätere Neu-Interpretation (andere Regel, anderer Schwellwert) ohne erneuten API-Aufruf, ohne die Satzfenster
zu speichern (Karte: „keine Satzfenster“). Dafür müssen die **fensterbasierten Aggregate** gespeichert werden, die
alle in Abschnitt 2 genannten Regelvarianten tragen.

```ts
export type AiTextAssessment = {
  provider: 'pangram';
  requestedModel: string; // Request-Selektor, z. B. "pangram-4" — steht nicht in der Antwort
  modelVersion: string; // response.version, z. B. "4.0"
  assessedAt: string; // ISO-8601 Prüfdatum
  transcriptSha256: string; // Hash des geprüften Transkripts → erkennt nachträgliche Korrekturen (Re-Score-Politik)
  wordCount: number; // Σ windows[].word_count (Pangram-Zählung, nicht eigene)
  label: 'AI' | 'Mixed' | 'Human'; // prediction_short
  fractions: { ai: number; aiAssisted: number; human: number }; // fraction_ai / fraction_ai_assisted / fraction_human
  segmentCounts: { ai: number; aiAssisted: number; human: number }; // num_*_segments
  nonHumanConfidence: { high: number; medium: number; low: number }; // wortgewichtete Anteile der nicht-menschlichen Fenster je Stufe; Summe 1 (oder alle 0 bei label Human)
  highConfidenceNonHuman: boolean; // Ergebnis der Regel unten, zur Build-Zeit reproduzierbar
  confidenceRule: 'weakest-non-human-window@1'; // Regelversion, damit alte Einträge neu bewertet werden können
};
```

Bewusst **nicht** gespeichert: `windows[]` (Karte), `text` (liegt als `transcription` vor), `headline`/`prediction`
(englische Prosa, redundant zu `label`), `dashboard_link` (würde den Text auf pangram.com veröffentlichen;
`public_dashboard_link` bleibt `false`), `task_id` (48-h-Artefakt), `is_humanized`/`humanizer_score` (eigene
Behauptung „verschleiert“, außerhalb der Karte; bei Bedarf später als `maxHumanizerScore` ergänzbar).

Ablage als optionales Feld `aiTextAssessment?: AiTextAssessment` auf `SessionSpeech`
(`astro/src/models/session-speech.ts`); fehlt das Feld, gilt „nicht geprüft“ — auch nach `STAGE_FAILED` oder bei
< 50 Wörtern. Das Badge rendert nur bei `label ∈ {AI, Mixed} ∧ highConfidenceNonHuman` (Abschnitt 2); eine spätere
Variante (b) braucht nur `fractions`.

## Abweichungen von den Notizen der Karte

- Notizen: „Konfidenz“ als gespeichertes Feld der Zusammenfassung — die API hat **keine** dokumentweite Konfidenz;
  das Feld muss als Ableitung aus den Fenstern definiert werden (Abschnitt 2/6).
- Notizen: „Free-Plan 2.000 Wörter/Tag“ — gilt für das Dashboard, nicht nachweisbar für die API; API läuft über
  Prepaid-Credits (Abschnitt 5).
- Der zitierte unabhängige Test (~22 % menschlicher Meeting-Transkripte markiert) ist die Substack-Studie von
  K. Zieminski (veröffentlicht 2026-08-27, Testzeitraum ab 2026-07-21 — also **vor und nach** dem Pangram-4-Release am
  2026-07-29, Modellversion nicht genannt); die gezeigten Fehlalarme sind 52 und 65 Wörter lang, also knapp über dem
  Minimum. Keine Widerlegung des Tors, aber Hinweis: Das Tor sollte Beiträge in realistischer Länge (mehrere hundert
  Wörter) messen und zusätzlich eine Mindestlänge für redaktionell ausgewählte Beiträge erwägen.
