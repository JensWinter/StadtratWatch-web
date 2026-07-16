# Nachverfolgbarkeit von Anträgen und Beschlüssen (A0135/25) — Machbarkeits-Entscheidung & Datenlücken

**Handoff-Dokument.** Übergabefertige Zusammenführung der Wayfinder-Map [Nachverfolgbarkeit von Anträgen und Beschlüssen (A0135/25) (#468)](https://github.com/JensWinter/StadtratWatch-web/issues/468). Es bündelt (1) die **Machbarkeits-Entscheidung** zu den zwei Wünschen des Antrags A0135/25, (2) den **Verweis auf die Spec** für den umsetzbaren Teil und (3) die **Datenlücken-Liste** für den nicht umsetzbaren Teil. Es entscheidet nichts neu — jede Aussage ist in den verlinkten Tickets/Dokumenten belegt.

Datum: 2026-07-16

Quellen:

- Antrag A0135/25 (SPD/Tierschutzallianz/Volt) — `docs/misc/Antrag.pdf`
- Stellungnahme der Stadt S0403/25 — `docs/misc/Stellungnahme.pdf`
- [T1 · Beschlussnummer-Extraktion (#469)](https://github.com/JensWinter/StadtratWatch-web/issues/469) — `docs/research/2026-07-16-beschlussnummer-extraktion.md`
- [T2 · Umsetzungsstand-Datenlücke (#470)](https://github.com/JensWinter/StadtratWatch-web/issues/470) — `docs/research/2026-07-16-umsetzungsstand-datenluecke.md`
- [T3 · Spec Beschlussnummer (#471)](https://github.com/JensWinter/StadtratWatch-web/issues/471) — `docs/research/2026-07-16-beschlussnummer-spec.md`

---

## 1. Ausgangslage

Der Antrag A0135/25 richtet zwei Wünsche an die Stadtverwaltung:

1. **Eindeutige Zuordnung Antrags-/Vorlagennummer ↔ Beschlussnummer** — nachvollziehbar machen, welche Drucksache zu welchem formalen Stadtratsbeschluss geführt hat.
2. **Öffentliche Übersicht zum Umsetzungsstand** von Beschlüssen — Bearbeitungsstatus und voraussichtlicher Abschlusszeitpunkt je gefasstem Beschluss.

Die Stellungnahme der Stadt (S0403/25) empfiehlt Ablehnung und nennt die Randbedingungen: Beschlussnummern werden händisch in der Niederschrift vergeben (DA 13/02); eine Harmonisierung mit den Vorlagennummern sei „technisch nicht möglich“; eine Vorlage könne mehrere Beschlussnummern erzeugen (Änderungsanträge, Einzelabstimmungen). Der Umsetzungsstand werde seit 2008 intern in einer halbjährlichen Excel-„Beschlusskontrolle“ geführt, aber wegen interner Inhalte nicht veröffentlicht.

Diese Map hat geprüft, **was StadtratWatch aus rein öffentlichen Daten** (OParl der Stadt + eigene Abstimmungsdaten) davon leisten kann — unabhängig davon, was die Verwaltung an ihren internen Systemen ändert.

### Bereits vorhandene Baseline

Die Paper-Seite (`astro/src/pages/paper/index.astro`) bietet heute schon **funktionale Vorlage↔Abstimmung-Nachverfolgbarkeit in beide Richtungen**: einen Beratungen-Tab (Consultation-Timeline mit Ergebnis-Badge und Link zur Sitzung), einen Abstimmungen-Tab (gescannte Stimmen je Fraktion, verlinkt zur Abstimmungs-Detailseite) und den Vorlagen-Baum; die Abstimmungs-Detailseite verlinkt zurück auf die Vorlage. Was in dieser Baseline **genuin fehlt**, ist allein die formale **Beschlussnummer** und jeglicher **Umsetzungsstand** — genau die zwei Antragswünsche.

## 2. Machbarkeits-Entscheidung

| Antragswunsch | Aus öffentlichen Daten machbar? | Ergebnis |
| --- | --- | --- |
| **1 · Zuordnung Vorlagennummer ↔ Beschlussnummer** | **Ja** — hohe Zuverlässigkeit, ohne OCR | Spec liegt vor → Abschnitt 3 |
| **2 · Öffentliche Übersicht Umsetzungsstand** | **Nein** — keine öffentliche Quelle | Datenlücke → Abschnitt 4 |

**Kernaussage für die Öffentlichkeit:** StadtratWatch kann Wunsch 1 aus rein öffentlichen Daten bedienen und damit die zentrale Behauptung der Stellungnahme — die Zuordnung sei „technisch nicht möglich“ — widerlegen: Sie ist in der Niederschrift bereits vollzogen und maschinell auslesbar. Wunsch 2 dagegen scheitert nicht an StadtratWatch, sondern an einer bewussten Nicht-Veröffentlichung der Stadt; Abschnitt 4 benennt exakt, welche Freigabe ihn öffentlich machbar würde.

## 3. Wunsch 1 — umsetzbar (Spec liegt vor)

Die formale **Stadtrats-Beschlussnummer** (Format `NNN-S(WP)YY`, z. B. `541-016(VIII)25`) steht in den Niederschrift-PDFs (`Meeting.resultsProtocol`) je Tagesordnungspunkt direkt bei der zugehörigen **Drucksachennummer**. Diese Drucksachennummer ist identisch mit dem `reference`-Feld der OParl-Papers und dort eindeutig — die Zuordnung Beschlussnummer → Paper ist ein sauberer Join. Der von der Verwaltung genannte harte Fall (eine Vorlage → mehrere Beschlussnummern) löst sich, weil die Niederschrift jedem Änderungsantrag einen eigenen Unter-TOP mit eigener, suffigierter Drucksachennummer (`…/1`) gibt, die als eigenes Paper existiert. Belege: `docs/research/2026-07-16-beschlussnummer-extraktion.md`.

**Die übergabefertige Spec** dafür liegt in `docs/research/2026-07-16-beschlussnummer-spec.md`. Kurzfassung:

- **Datenweg (zweistufig, analog `voting-paper-map.json`):** ein maintainer-seitiges Deno-Script extrahiert je Stadtrats-Niederschrift `(Drucksachennummer, Beschlussnummer, Ergebnis)` via `pdftotext -layout` und schreibt ein committetes Derivat `data/{period}/beschluss-map.json` (Schlüssel `paperId`); `generate-paper-assets` faltet es in die Papers-Web-Assets. Der Web-Build bleibt PDF-frei.
- **UI:** ein klickbarer `Beschluss-Nr. {nummer}`-Chip im Kopfbereich der Paper-Seite (primär, ohne Ergebnis, Link auf die Sitzung; bei 0 Nummern still weglassen) plus dasselbe Echo am gematchten Konsultationseintrag im Beratungen-Tab.
- **Korrektheit:** konservative Emission (im Zweifel überspringen + Validierungs-Report statt Rateversuch), Build-Zeit-Konsistenzcheck; Leitprinzip „eine falsche Zuordnung ist schlimmer als eine fehlende“.
- **Abdeckung:** beide Wahlperioden; WP VIII validiert, WP VII per Report-Abnahme.

Die **Implementierung** dieser Spec ist ein eigener Effort (out of scope dieser Map).

## 4. Wunsch 2 — Datenlücke

Es existiert **keine öffentliche Quelle für den Umsetzungsstand.** Weder OParl noch die Abstimmungsdaten sagen etwas darüber aus, ob ein gefasster Beschluss umgesetzt wurde. Details: `docs/research/2026-07-16-umsetzungsstand-datenluecke.md`.

- **OParl kennt kein Umsetzungs-/Erledigungsfeld.** `OparlPaper` trägt keinen Status; das einzige nahe Feld, `agendaItem.result`, beschreibt den **Verfahrensausgang** in der Sitzung (angenommen/abgelehnt/vertagt/verwiesen …), nicht den Umsetzungsstand danach. Sobald ein TOP-Ergebnis `beschlossen` lautet, endet die Spur in OParl. Das entspricht auch dem OParl-Standard selbst.
- **Die Information existiert nur intern:** die seit 2008 geführte halbjährliche „Beschlusskontrolle“-Excel, laut Stellungnahme bewusst nicht veröffentlicht, weil sie mit vertraulichen Inhalten (Verhandlungsstände, Firmen-/Geschäftsbelange) vermengt ist.

### Was nötig wäre, damit StadtratWatch Wunsch 2 bedienen könnte

Alle drei Punkte liegen **außerhalb** des Einflussbereichs von StadtratWatch und sind konkrete Forderungen an die Stadt:

1. **Öffentliche, bereinigte Ableitung der Beschlusskontrolle** — eine je Beschluss geführte, veröffentlichungsfähige Statusspalte (z. B. `offen` / `in Umsetzung` / `umgesetzt` / `nicht umsetzbar`) plus optionalem Zieltermin, ohne die vertraulichen Freitext-Inhalte.
2. **Verknüpfbarer Schlüssel** — je Zeile die **Drucksachennummer** (`reference`) und/oder die **Beschlussnummer**, damit StadtratWatch den Datensatz an die bestehende Vorlage/Beratung joinen kann. (Die Beschlussnummer ist nach Wunsch 1 ohnehin extrahierbar — sie wäre der natürliche Join-Schlüssel.)
3. **Maschinenlesbares, wiederkehrendes Format** — idealerweise als OParl-Erweiterung, mindestens als regelmäßig aktualisierte CSV/JSON-Veröffentlichung, nicht als reines PDF.

Damit wird das „wir veröffentlichen das nicht“ der Stadt zu einer präzisen, öffentlichen Forderung: nicht „alles offenlegen“, sondern *eine bereinigte Statusspalte mit Drucksachen-/Beschlussnummer-Schlüssel in einem maschinenlesbaren Format*.

## 5. Aufstellung der Lücken (kompakt)

| Fähigkeit | Status | Woran es liegt / was fehlt |
| --- | --- | --- |
| Vorlage ↔ Abstimmung (funktional) | ✅ vorhanden | Baseline der Paper-Seite |
| Vorlage ↔ formale Beschlussnummer | 🟡 machbar, Spec liegt vor | Umsetzung offen (eigener Effort) |
| Ausschuss-Beschlussnummern | 🟡 machbar, später | zurückgestellt (Fog der Map), keine Datenlücke |
| Beschluss-Wortlaut/-text auf der Seite | 🟡 machbar, später | zurückgestellt (Fog der Map), keine Datenlücke |
| Umsetzungsstand von Beschlüssen | 🔴 nicht machbar | echte Datenlücke — Freigabe der Stadt nötig (Abschnitt 4) |

## 6. Wo dieses Artefakt lebt & nächste Schritte

**Ablageort:** dieses Repo-Dokument (`docs/wayfinder/472-...`), versioniert neben den drei Detail-Dokumenten der Map — so bleibt die gesamte Beweiskette zusammen. Eine Aufbereitung als **öffentliche Seite** oder als Beitrag zur laufenden Beratung von A0135/25 ist ein möglicher Folge-Schritt, aber bewusst **nicht Teil dieser Map** (die Map plant, sie baut nicht).

Anschlussfähige Efforts, jeweils eigenständig:

- **Umsetzung von Wunsch 1** nach `docs/research/2026-07-16-beschlussnummer-spec.md`.
- **Öffentliche Aufbereitung** dieser Machbarkeits-Entscheidung und der Datenlücke als Argument im politischen Prozess.
- **Ausschuss-Beschlussnummern** und **Beschluss-Wortlaut** als spätere Erweiterungen (beide machbar, aus dem Fog dieser Map).
