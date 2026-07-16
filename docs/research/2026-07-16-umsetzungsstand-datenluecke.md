# Umsetzungsstand von Beschlüssen — öffentliche Quelle? (Datenlücke)

Datum: 2026-07-16
Ticket: [T2 (#470)](https://github.com/JensWinter/StadtratWatch-web/issues/470) der Wayfinder-Map [#468](https://github.com/JensWinter/StadtratWatch-web/issues/468)
Frage: Wunsch 2 des Antrags A0135/25 verlangt eine öffentliche Übersicht über den **Umsetzungsstand**
von Beschlüssen (Bearbeitungsstatus, voraussichtlicher Abschlusszeitpunkt). Gibt es dafür eine
öffentliche Datenquelle, die StadtratWatch nutzen könnte?

## Fazit

**Nein — es existiert keine öffentliche Quelle für den Umsetzungsstand.** Weder das OParl-API der Stadt
Magdeburg noch StadtratWatchs eigene Abstimmungsdaten enthalten Informationen darüber, ob und wie weit
ein gefasster Beschluss von der Verwaltung tatsächlich umgesetzt wurde. Diese Information lebt
ausschließlich in einem internen, **bewusst nicht veröffentlichten** Instrument der Verwaltung (die
halbjährliche „Beschlusskontrolle"-Excel, laut Stellungnahme S0403/25 seit 2008 geführt).

StadtratWatch kann Wunsch 2 daher **aus rein öffentlichen Daten nicht erfüllen.** Es handelt sich um eine
echte Datenlücke, nicht um ein Extraktions- oder Aufbereitungsproblem. Ein Proxy-Bau (z. B. „Folge-Trail"
aus späteren Vorlagen) wurde für diese Map verworfen; hier wird die Lücke nur dokumentiert.

## Belege

### 1. OParl exponiert keinen Umsetzungsstatus

Geprüft gegen das Modell `astro/src/models/oparl.ts` **und** die lokal vorliegenden Rohdaten in
`data/oparl-magdeburg/` (empirisch alle vorkommenden Feld-Keys ausgewertet, das Modell ist also kein
verkürztes Abbild):

- **`OparlPaper`** (Vorlage): Felder sind `reference`, `paperType`, `date`, Beziehungen
  (`superordinatedPaper`/`subordinatedPaper`/`underDirectionOf`), `consultation`, `auxiliaryFile`.
  **Kein Statusfeld.** Eine Vorlage trägt keinerlei Information über den Fortgang nach der Beschlussfassung.
- **`OparlConsultation`** (Beratung): `role`, `authoritative`, Verweise auf `meeting`/`paper`/`agendaItem`.
  `authoritative` markiert nur, ob dies die *maßgebliche* (beschließende) Beratung ist — kein Umsetzungsstand.
- **`OparlAgendaItem`** (Tagesordnungspunkt): trägt als einziges ein `result`-Feld. Das ist jedoch das
  **Beschlussergebnis in der Sitzung**, nicht der Umsetzungsstand danach.

Die tatsächlich vorkommenden `result`-Werte (aus `agenda-items.json`, Häufigkeit absteigend) sind:

| Häufigkeit | `result` |
|-----------:|----------|
| 11.065 | zur Kenntnis genommen |
| 5.995 | genehmigt OB |
| 5.906 | ungeändert beschlossen |
| 5.756 | empfohlen |
| 5.376 | vertagt |
| 2.460 | schriftliche Stellungnahme |
| 1.959 | nicht empfohlen |
| 1.522 | in die Ausschüsse verwiesen |
| 1.229 | abgelehnt |
| 1.133 | geändert beschlossen |
| 1.044 | zurückgestellt |

Diese Werte beschreiben den **Verfahrensausgang** eines TOP (angenommen, abgelehnt, vertagt, verwiesen …).
Sie sagen nichts darüber, ob eine einmal **beschlossene** Maßnahme von der Verwaltung inzwischen
umgesetzt wurde, in Bearbeitung ist oder wann sie voraussichtlich abgeschlossen wird — genau das ist der
Gegenstand von Wunsch 2. Sobald ein TOP-Ergebnis `beschlossen` lautet, endet die Spur in OParl.

Das entspricht auch dem OParl-Standard selbst: der Objektumfang (Body, Paper, Consultation, AgendaItem,
Meeting, File, Organization) kennt kein Feld für die Umsetzungs-/Erledigungskontrolle eines Beschlusses.

### 2. Was die Stadt hält — und warum es nicht öffentlich ist

Laut Stellungnahme der Stadt (S0403/25) zum Antrag A0135/25:

- Die Verwaltung führt seit **2008** eine **halbjährliche „Beschlusskontrolle"** als **Excel-Tabelle**.
  Darin wird der Bearbeitungs-/Umsetzungsstand der Stadtratsbeschlüsse nachgehalten.
- Diese Tabelle wird **bewusst nicht veröffentlicht**, weil sie **interne Inhalte** enthält — u. a.
  Verhandlungsstände und Firmen-/Geschäftsbelange, die einer Veröffentlichung entgegenstehen.
- Es gibt keine öffentliche, gefilterte Ableitung dieser Tabelle und keine OParl-Anbindung dafür.

Die Information existiert also, ist aber a) nicht maschinenlesbar publiziert und b) in ihrer Rohform
mit vertraulichen Inhalten vermengt.

### 3. Was nötig wäre, damit StadtratWatch den Umsetzungsstand abbilden könnte

Damit die Plattform Wunsch 2 aus öffentlichen Daten bedienen könnte, müsste die Stadt eine der
folgenden Freigaben schaffen — alle liegen **außerhalb** des Einflussbereichs von StadtratWatch:

1. **Öffentliche, bereinigte Ableitung der Beschlusskontrolle.** Eine je Beschluss geführte,
   veröffentlichungsfähige Statusspalte (z. B. `offen` / `in Umsetzung` / `umgesetzt` / `nicht
   umsetzbar`) plus optionalem Zieltermin, aus der die vertraulichen Freitext-Inhalte
   (Verhandlungsstände, Firmenbelange) entfernt sind.
2. **Verknüpfbarer Schlüssel.** Der Datensatz müsste je Zeile die **Drucksachennummer** (`reference`)
   und/oder die **Beschlussnummer** tragen, damit StadtratWatch ihn an die bestehende Vorlage/Beratung
   joinen kann. (Die Beschlussnummer ist laut [T1 (#469)](https://github.com/JensWinter/StadtratWatch-web/issues/469)
   ohnehin aus den Niederschriften extrahierbar — sie wäre der natürliche Join-Schlüssel.)
3. **Maschinenlesbares, wiederkehrendes Format.** Idealerweise als OParl-Erweiterung oder zumindest als
   regelmäßig aktualisierte CSV/JSON-Veröffentlichung (analog zur halbjährlichen Fortschreibung), nicht
   als reines PDF.

Ohne eine solche Freigabe bleibt der Umsetzungsstand eine dokumentierte Lücke: StadtratWatch kann
zeigen, *dass* und *wie* etwas beschlossen wurde, aber nicht, *ob es umgesetzt* wurde.

## Konsequenz für die Map

- **Wunsch 2 ist nicht umsetzbar** und geht als Kernpunkt in die Datenlücken-Liste
  ([T4 #472](https://github.com/JensWinter/StadtratWatch-web/issues/472)) ein.
- Für die Spec ([T3 #471](https://github.com/JensWinter/StadtratWatch-web/issues/471)) bedeutet das:
  keine Umsetzungsstands-Features; die Spec beschränkt sich auf die aus T1 abgeleiteten Verbesserungen
  der Nachverfolgbarkeit (Wunsch 1).
