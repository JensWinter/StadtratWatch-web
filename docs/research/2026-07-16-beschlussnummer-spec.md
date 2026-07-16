# Spec: Stadtrats-Beschlussnummer auf der Paper-Seite (Wunsch 1)

Datum: 2026-07-16
Ticket: [T3 · Spec umsetzbare Verbesserungen der Nachverfolgbarkeit (#471)](https://github.com/JensWinter/StadtratWatch-web/issues/471)
der Wayfinder-Map [Nachverfolgbarkeit von Anträgen und Beschlüssen (A0135/25) (#468)](https://github.com/JensWinter/StadtratWatch-web/issues/468)
Fundament: [T1 · Beschlussnummer-Extraktion (#469)](https://github.com/JensWinter/StadtratWatch-web/issues/469) —
`docs/research/2026-07-16-beschlussnummer-extraktion.md`

## Zweck

Übergabefertige Feature-Spec für den **umsetzbaren** Teil von Wunsch 1 des Antrags A0135/25: die formale
**Beschlussnummer** des Stadtrats aus den Niederschriften extrahieren und auf der Paper-Seite eindeutig
mit der Vorlage verknüpfen. Damit macht StadtratWatch aus rein öffentlichen Daten die Zuordnung
Vorlagennummer ↔ Beschlussnummer sichtbar, die die Stellungnahme S0403/25 für „technisch nicht möglich"
erklärt.

Diese Spec beschreibt das **Was** (Datenweg, Datenform, UI, Validierung), nicht das **Wie** der
Implementierung. Das tatsächliche Bauen ist ein eigener Effort (out of scope dieser Map).

## Umfang (was diese Spec trägt)

Ausschließlich die **Stadtrats-Beschlussnummer**: Extraktion → committetes Derivat → Faltung in die
Papers-Web-Assets → Kopf-Chip + Beratungen-Echo, mit konservativen Validierungs-Leitplanken.

Bewusst **nicht** in dieser Spec (mit Zielort):

| Ausgeschlossen | Wohin |
| --- | --- |
| Umsetzungsstand von Beschlüssen (Wunsch 2) | Datenlücke (T4) — keine öffentliche Quelle (T2) |
| Ausschuss-Beschlussnummern (mit Kennbuchstaben) | Fog / Not yet specified — machbar, später |
| Beschluss-*Wortlaut*/-text auf der Seite | Fog / Not yet specified — machbar, später |
| Harmonisierung/Umbenennung der Nummernsysteme im städtischen RIS | Out of scope — StadtratWatch ist unabhängig |

## Entscheidungen (aus dem Grilling zu #471)

1. **Umfang:** UI **und** Datenpipeline (nicht nur UI-Feature-Spec).
2. **Primärer Anker:** Kopfbereich der Paper-Seite; Beratungen-Tab als sitzungsgenaues Echo.
3. **Gremien:** nur Stadtrats-Niederschriften. Ausschüsse → Fog.
4. **Kardinalität/Leerzustand:** bei 0 Beschlussnummern **still weglassen** (kein „kein Beschluss"-Label,
   da Extraktionslücke und echte Nicht-Beschlussfassung nicht sicher unterscheidbar sind); bei ≥1 zeigen,
   bei n>1 als Liste.
5. **Kopf-Chip:** klickbarer Chip `Beschluss-Nr. {nummer}`, verlinkt auf die Sitzungsseite; **ohne**
   Ergebnis im Kopf (reine Identität/Zuordnung).
6. **Echo:** derselbe Chip am gematchten Stadtrats-Konsultationseintrag neben dem Ergebnis-Badge.
7. **Datenweg:** zweistufig — committetes `beschluss-map.json` + Faltung in die Papers-Web-Assets
   (kein eigener Client-Fetch).
8. **Derivat-Form:** je Wahlperiode, `paperId`-Schlüssel, Array-Wert; Link-Auflösung erst bei der Faltung.
9. **Korrektheit:** konservative Emission (skip + Validierungs-Report statt Rateversuch) +
   Build-Zeit-Konsistenzcheck.
10. **Abdeckung:** beide Wahlperioden; WP VIII validiert, WP VII per Report-Abnahme.
11. **Abgrenzung:** siehe Umfangs-Tabelle oben.
12. **Artefakt:** dieses Dokument unter `docs/research/`.

## Datenweg (Ebene B)

Zweistufig, analog zum bestehenden `voting-paper-map.json`-Muster. Der Web-Build bleibt PDF-frei
(CLAUDE.md-Regel: der Web-Build liest nur Derivate, nie roh-OParl/PDFs).

### Stufe 1 — Extraktion (maintainer-seitig)

Neues Deno-Script, z. B. `src/scripts/extract-beschluss-numbers/`:

1. Aus `meetings.json` je **Stadtrats**-Sitzung die `resultsProtocol.accessUrl` ziehen.
2. PDF laden, `pdftotext -layout` (layout-basiert nötig, kein OCR).
3. Text in TOP-Abschnitte segmentieren; je Abschnitt `(Drucksachennummer, Beschlussnummer, Ergebnis)`
   extrahieren.
4. `reference → paperId` joinen; Referenz normalisieren (Tippfehler-Toleranz, s. u.).
5. Ausgabe als committetes Derivat `data/{period}/beschluss-map.json`.

### Stufe 2 — Auslieferung (Faltung)

`generate-paper-assets` liest `beschluss-map.json` und faltet es in die Papers-Web-Assets
(`web-assets/papers/papers-{n}.json`):

- ein Beschlussnummern-Feld am Paper-Objekt (für den Kopf-Chip),
- Anreicherung der passenden Konsultations-Einträge (für das Echo),
- **Sitzungs-Link-Auflösung** (OParl-Meeting → StadtratWatch-Session-Seite) hier, mit **derselben Logik,
  die heute schon die Konsultations-Links in `generate-paper-assets` setzt**. Wo keine StadtratWatch-Session
  existiert, wird der Chip zu reinem Text (kein toter Link).

## Datenform: `data/{period}/beschluss-map.json`

- **Granularität:** eine Datei je Wahlperiode (Beschlussnummern sind WP-gebunden, z. B. `(VIII)`).
- **Schlüssel:** `paperId`. Die gesamte Text-/Referenz-Heuristik (Normalisierung, Join) lebt im Extraktor;
  die Faltung ist ein trivialer `paperId`-Lookup.
- **Wert:** Array (n>1 möglich) von Einträgen:

```jsonc
{
  "<paperId>": [
    {
      "beschlussnummer": "541-016(VIII)25",
      "sitzung": "016(VIII)25",        // Sitzungskennung aus der Nummer
      "sessionDate": "2025-06-19",      // aus dem Protokoll/Meeting
      "meetingId": "<oparl-meeting-id>",// zur Session-Auflösung bei der Faltung
      "ergebnis": "angenommen",         // aus dem Protokoll; NICHT im Kopf gezeigt
      "reference": "A0015/25"           // zur Nachvollziehbarkeit
    }
  ]
}
```

Das Derivat bleibt **roh** (trägt `meetingId`/`sessionDate`, aber keine aufgelöste `sessionId`/`ppId`) —
die Sitzungs-Verlinkung entsteht erst bei der Faltung.

## Extraktions-Heuristik & Validierung (Ebene B, Korrektheit)

Leitprinzip: **eine falsche Zuordnung ist schlimmer als eine fehlende** — sie diskreditiert genau die
Aussage, die StadtratWatch machen will.

1. **Nur Beschluss-Position zählt** (T1-Caveat 4): eine Beschlussnummer wird nur zugeordnet, wenn sie in
   Beschluss-Position steht (eigene Zeile nach „Der Stadtrat beschließt …:"), nie eine im Fließtext
   *zitierte* historische Nummer.
2. **Zuordnungsregel:** jede Beschlussnummer → nächstgelegene vorangehende Drucksachennummer ihres
   TOP-Abschnitts (T1).
3. **Referenz-/WP-Normalisierung** (T1-Caveat 1): Tippfehler tolerieren (`(VII)` vs `(VIII)`,
   Leerzeichen wie `A0024/25 /1`) und Referenzen/Wahlperioden normalisieren.
4. **Konservative Emission:** ein Mapping wird nur ausgegeben, wenn das Paar (Drucksachennr, Beschlussnr)
   im TOP-Abschnitt eindeutig ist **und** `reference` auf **genau ein** Paper auflöst. Sonst
   **überspringen** und in einen **Validierungs-Report** schreiben (Maintainer-Review, im Geist des
   bestehenden manuellen OCR-Reviews).
5. **Build-Zeit-Konsistenzcheck:** analog `astro/src/content-validation/voting-paper-map-consistency.ts`
   ein Check, der den Build bricht, wenn ein `beschluss-map`-Eintrag auf eine unbekannte
   `paperId`/`reference` zeigt.

### Abdeckung beim ersten Lauf

Beide Wahlperioden. **WP VIII** (2024/2025) ist von T1 validiert; **WP VII** (`magdeburg-7`) läuft
„best effort" — dank konservativer Emission erzeugt Formatdrift nur Skips im Report, keine Falschdaten.
Der Validierungs-Report ist das Abdeckungsmaß und wird vor Veröffentlichung von WP VII gesichtet.

Erwartete legitime Lücken (kein Fehler): Verfahrens-Beschlüsse ohne Drucksache (T1-Caveat 2) und
Vorlagen ohne Beschluss (Überweisung/Absetzung/Vertagung, T1-Caveat 3).

## UI (Ebene A)

Betroffen: `astro/src/pages/paper/index.astro`.

### Kopfbereich (primärer Anker)

Direkt neben `reference`/`type` (heute Zeile 10–14). Rendert je Beschlussnummer einen klickbaren Chip:

- **Label:** `Beschluss-Nr. {nummer}` (Präfix erklärt die kryptische Nummer).
- **Ohne Ergebnis** — der Chip ist reine Identität/Zuordnung.
- **Klickziel:** Sitzungsseite `/pp/{ppId}/session/{sessionId}/`, sofern eine StadtratWatch-Session
  existiert; sonst reiner Text.
- **Kardinalität:** 0 → still weglassen (kein Label); 1 → ein Chip; n>1 → kurze Chip-Liste.

### Beratungen-Tab (sitzungsgenaues Echo)

Am gematchten Stadtrats-Konsultationseintrag (heute `result`-Badge, Zeile 123–147) derselbe
`Beschluss-Nr. {nummer}`-Chip neben dem Ergebnis-Badge. Kein eigener Link (der Timeline-Eintrag
verlinkt bereits zur Sitzung). Der Kopfbereich trägt die vollständige Menge; die Timeline zeigt nur die
sitzungsgenau zuordenbaren Nummern (Kein-Match-Fall aus Frage 6).

## Belege & Detailtiefe

Format, Verfügbarkeit (1.606 Meetings mit `resultsProtocol`, davon 134 Stadtrats-Sitzungen),
Join-Eindeutigkeit von `reference` und die Kanten-Fälle sind in
`docs/research/2026-07-16-beschlussnummer-extraktion.md` belegt.

## Konsequenzen für die Map

- T3 (#471) ist damit vollständig spezifiziert und aufgelöst.
- Neuer Fog: **Ausschuss-Beschlussnummern** und **Beschluss-Wortlaut anzeigen** (beide machbar, später).
- Feeds T4 (#472): die Machbarkeits-Entscheidung verweist für den umsetzbaren Teil auf diese Spec.
