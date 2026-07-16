# Beschlussnummer-Extraktion aus den Niederschrift-PDFs

Datum: 2026-07-16
Ticket: [T1 (#469)](https://github.com/JensWinter/StadtratWatch-web/issues/469) der Wayfinder-Map [#468](https://github.com/JensWinter/StadtratWatch-web/issues/468)
Frage: Lässt sich die formale **Beschlussnummer** aus den Niederschrift-PDFs (`Meeting.resultsProtocol`)
zuverlässig extrahieren und einer Vorlage (Drucksachennummer) zuordnen? Das ist der wörtliche Wunsch 1
des Antrags A0135/25.

## Fazit

**Ja — machbar, mit hoher Zuverlässigkeit und ohne OCR.** Die Niederschriften sind digitale
(text-basierte) PDFs; `pdftotext -layout` liefert sauberen Text. Jede Niederschrift enthält die
Beschlussnummern in einem konsistenten, parsebaren Format (`Beschluss-Nr. NNN-S(WP)YY`), und jede
Beschlussnummer steht innerhalb ihres Tagesordnungspunkt-Abschnitts direkt bei der zugehörigen
**Drucksachennummer**. Diese Drucksachennummer ist identisch mit dem `reference`-Feld der OParl-Papers
(z. B. `A0135/25`, `DS0280/25/1`) und dort **eindeutig** — die Zuordnung Beschlussnummer → Paper ist
also ein sauberer Join über `reference`.

Damit widerlegt StadtratWatch aus rein öffentlichen Daten die Kernaussage der Stellungnahme S0403/25,
eine Zuordnung Vorlagennummer ↔ Beschlussnummer sei „technisch nicht möglich": Sie ist in der
Niederschrift bereits vollzogen und maschinell auslesbar. Der von der Verwaltung genannte harte Fall
(eine Vorlage → mehrere Beschlussnummern bei Änderungsanträgen/Einzelabstimmungen) löst sich, weil die
Niederschrift jedem Änderungsantrag einen eigenen Unter-TOP mit eigener, suffigierter Drucksachennummer
(`…/1`, `…/1/1`) gibt, die als eigenes Paper existiert.

Empfehlung: In die Spec ([T3 #471](https://github.com/JensWinter/StadtratWatch-web/issues/471))
übernehmen — sowohl die Extraktions-Pipeline (neues Derivat analog `voting-paper-map.json`) als auch
die Darstellung der Beschlussnummer auf der Paper-Seite (Beratungen/Abstimmungen-Tab).

## Belege

### Verfügbarkeit der Niederschriften

Aus `data/oparl-magdeburg/meetings.json` (3.670 Meetings):

- **1.606 Meetings** tragen ein `resultsProtocol` (Niederschrift), davon **134 Stadtrats-Sitzungen**.
- Nur 3 Meetings tragen ein `verbatimProtocol` — die `resultsProtocol` ist die relevante Quelle.
- Die Datei ist ein öffentliches PDF, z. B.
  `https://ratsinfo.magdeburg.de/oparl/bodies/0001/downloadfiles/a/00698259.pdf`.

Untersucht wurden zwei Stadtrats-Niederschriften:

- `00698259.pdf` — Stadtrat 2024-07-08 (konstituierende Sitzung `SR/001(VIII)/24`, 31 Seiten)
- `00721695.pdf` — Stadtrat 2025-06-19 (125 Seiten; hier wurde A0135/25 selbst behandelt)

### Format der Beschlussnummer

Die Beschlussnummer folgt der Systematik aus DA 13/02 (`lfd.Nr - Sitzungsnr (Wahlperiode) Jahr`),
für den Stadtrat ohne Ausschuss-Kennbuchstaben:

```
Beschluss-Nr. 009-1(VIII)24     → lfd.Nr 009, Sitzung 1,  WP VIII, 2024
Beschluss-Nr. 541-016(VIII)25   → lfd.Nr 541, Sitzung 16, WP VIII, 2025
```

Die laufende Nummer ist offenbar jahresweise kumulativ (541 im Juni 2025). Über beide PDFs:
126 gültige Beschlussnummern, ganz überwiegend `(VIII)`.

### Zuordnung Beschlussnummer → Drucksachennummer → Paper

Jeder beschlossene TOP-Abschnitt hat die Struktur:

```
12.2.   Gremienbesetzungen                                   DS0273/24
        BE: Oberbürgermeisterin
Der Stadtrat beschließt mit 51 Ja-, 0 Neinstimmen und 1 Enthaltung:
                                        Beschluss-Nr. 009-1(VIII)24
<Beschlusstext>
```

Die Drucksachennummer steht in der Abschnitts-Überschrift, die Beschlussnummer folgt nach der
`Der Stadtrat beschließt …:`-Zeile. **Zuordnungsregel:** jede Beschlussnummer wird der nächstgelegenen
vorangehenden Drucksachennummer ihres TOP-Abschnitts zugeordnet.

Die Drucksachennummer entspricht exakt dem `reference`-Feld der OParl-Papers und ist dort eindeutig:

- `papers.json`: 14.028 Papers mit `reference`, **13.741 distinkt**; der einzige Mehrfachwert ist der
  Leerstring `""` (288 Papers ohne Referenz). Unter allen Papers **mit** Referenz ist `reference`
  also eindeutig — ein perfekter Join-Schlüssel.
- Stichprobe (jeweils genau 1 Paper): `DS0280/25`, `DS0280/25/1`, `A0015/25`, `A0015/25/1`, `A0135/25`.

### Harter Fall: eine Vorlage → mehrere Beschlussnummern

In der Niederschrift 2025-06-19 werden Änderungsanträge/Einzelabstimmungen als **Unter-TOPs mit eigener
suffigierter Drucksachennummer** geführt, die je als eigenes Paper existieren:

```
5.3     Gedenkort … Anschlag        DS0280/25
5.3.1   Gedenkort … Anschlag        DS0280/25/1
5.3.1.1 Gedenkort … Anschlag        DS0280/25/1/1
6.8     Abwanderung … stoppen       A0015/25
6.8.1   Abwanderung … stoppen       A0015/25/1
6.8.2   Abwanderung … stoppen       A0015/25/2
```

Jeder Unter-TOP erhält seine eigene Beschlussnummer. Die Zuordnung bleibt damit 1 Beschlussnummer ↔
1 (Unter-)Referenz — das von der Stellungnahme beschriebene „Feld nicht vervielfältigbar"-Problem
existiert im Niederschrift-Text nicht.

## Extraktions-/Matching-Pipeline (Skizze für T3)

1. Aus `meetings.json` je Stadtrats-Sitzung `resultsProtocol.accessUrl` ziehen.
2. PDF laden, `pdftotext -layout`.
3. Text in TOP-Abschnitte segmentieren; je Abschnitt `(Drucksachennummer, Beschlussnummer, Abstimmergebnis)` extrahieren.
4. Drucksachennummer über `reference` auf Paper joinen.
5. Als committetes Derivat ausgeben — analog `voting-paper-map.json`, z. B. `beschluss-map.json`
   (`paper.reference` / `paperId` → `{ beschlussnummer, sessionDate, sitzung, ergebnis }`).

Aufwand: moderat, vergleichbar mit dem bestehenden `generate-paper-assets`-/Derivat-Muster.

## Caveats und Risiken

1. **Quelltext-Tippfehler.** In den Stichproben erscheint `(VII)` statt `(VIII)` und ein Leerzeichen in
   `A0024/25 /1`. Der Parser muss tolerant sein und Referenzen/Wahlperioden normalisieren.
2. **Nicht jede Beschlussnummer hat eine Drucksache.** Verfahrens-Beschlüsse (Tagesordnung, Wahlen,
   GO-Anträge) tragen eine Beschlussnummer, aber keine Drucksachennummer → kein Paper-Match (erwartet,
   erklärt die 126 Beschlussnummern vs. weniger DS-Referenzen).
3. **Nicht jede Vorlage bekommt eine Beschlussnummer.** Überweisungen (z. B. A0135/25 in den
   Verwaltungsausschuss), Absetzungen und Vertagungen erzeugen keinen Sitzungs-Beschluss.
4. **Zitierte historische Beschlussnummern.** Im Fließtext tauchen ältere Beschlussnummern auf
   (z. B. `…(IV)06`). Nur Beschlussnummern in Beschluss-Position (eigene Zeile nach
   `Der Stadtrat beschließt …:`) dürfen zugeordnet werden, keine im Text zitierten.
5. **Abdeckung/Formatstabilität.** Bestätigt für WP VIII (2024/2025). `resultsProtocol` existiert für
   1.606/3.670 Meetings; ältere Wahlperioden und nicht-öffentliche Teile vor einem Vollimport
   stichprobenartig prüfen.
6. **Digitale PDFs, kein OCR nötig** — aber layout-basiertes Parsing (`-layout`) erforderlich, da
   Drucksachennummer und Beschlussnummer über Whitespace/Spalten positioniert sind.

## Konsequenzen für die Map

- Beschlussnummer-Zuordnung wandert von „offen" zu **machbar** — relevant für die
  Machbarkeits-Entscheidung ([T4 #472](https://github.com/JensWinter/StadtratWatch-web/issues/472)).
- Die Fog-Notiz „falls Extraktion machbar, graduiert die Darstellungsform in T3" ist damit aufgelöst;
  [T3 (#471)](https://github.com/JensWinter/StadtratWatch-web/issues/471) ist jetzt vollständig
  spezifizierbar (Pipeline + UI).
