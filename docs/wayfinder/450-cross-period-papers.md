# Research: Kann eine Drucksache Abstimmungen aus mehreren Wahlperioden haben?

Ticket: [#450](https://github.com/JensWinter/StadtratWatch-web/issues/450) · Map: [#448](https://github.com/JensWinter/StadtratWatch-web/issues/448)

## Kurzantwort

**Ja, eine Drucksache kann Abstimmungen in mehreren Wahlperioden haben — und das kommt real vor.**
Paper-IDs sind **global eindeutig** (OParl-Paper-IDs), es gibt **keine Kollision** zwischen Perioden (gleiche Zahl ⇒ gleiche Drucksache).

## Datenbefund

Quellen: `data/magdeburg-7/voting-paper-map.json`, `data/magdeburg-8/voting-paper-map.json`, `data/paper-index.json`, `data/{period}/{date}/session-scan-*.json`.

| Frage | Ergebnis |
| --- | --- |
| Distinct paperIds in Periode 7 (magdeburg-7) map | 3014 |
| Distinct paperIds in Periode 8 (magdeburg-8) map | 3150 |
| **paperIds in BEIDEN Perioden-Maps** | **108** |
| paper-index Einträge / eindeutige IDs | 7393 / 7393 (global eindeutig) |

### Verifiziertes Live-Beispiel

`paperId 239123` — »Sanierung Neustädter See« (Referenz `A0171/22`):

| Wahlperiode | Sitzung | agendaItem | Scan-Datei | votingId |
| --- | --- | --- | --- | --- |
| magdeburg-7 | 2022-09-01 | 6.29 | `2022-09-01-073.png` | 73 |
| magdeburg-8 | 2024-10-17 | 7.1  | `2024-10-17-047.png` | 47 |

Beide Sitzungen haben ein **tatsächlich gescanntes** `session-scan`-Item für diese Drucksache — also nicht nur eine strukturelle OParl-Zuordnung, sondern echte Abstimmungen in zwei Wahlperioden.

Hinweis: Die 108 ist eine Obergrenze auf **Map-Ebene** (enthält TOP-Zuordnungen ohne gescannte Abstimmung). Die Zahl der Drucksachen mit *gescannten* Abstimmungen in beiden Perioden ist ggf. kleiner, aber der Fall existiert nachweislich (Beispiel oben).

## Folgen für den paper-votings-Reverse-Lookup (#451)

1. **Alle Perioden scannen.** Der Reverse-Lookup darf sich nicht auf eine Periode beschränken — er muss über *alle* `data/{period}/voting-paper-map.json` iterieren und die Treffer je paperId zusammenführen.
2. **Wahlperioden-Kontext je Abstimmung mitführen.** Die Periode ist nicht aus der Drucksache ableitbar (dieselbe Drucksache kann in mehreren Perioden abgestimmt worden sein). Jede Abstimmungs-Zeile im Asset braucht `parliamentPeriodId` — sowohl für den Deep-Link `/pp/{period}/session/{sessionId}/voting/{votingId}` als auch zur Anzeige.
3. **Join gegen die richtige Perioden-`registry`.** Personen/Fraktionen unterscheiden sich je Periode. Die `votesByFactions`-Aufschlüsselung jeder Abstimmung muss gegen die `registry.json` **ihrer eigenen** Periode gejoint werden.
