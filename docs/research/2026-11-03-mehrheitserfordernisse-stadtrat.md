# Mehrheitserfordernisse im Magdeburger Stadtrat

Datum: 2026-11-03
Ticket: [#617](https://github.com/JensWinter/StadtratWatch-web/issues/617) der Wayfinder-Map
[#616](https://github.com/JensWinter/StadtratWatch-web/issues/616)
Frage: Welche Mehrheitserfordernisse gelten für Abstimmungen im Magdeburger Stadtrat, wogegen werden
sie gezählt, was löst sie aus, und erkennt man den Auslöser an Typ oder Titel einer Abstimmung?

## Fazit

- **Regel:** einfache Mehrheit der Ja- und Nein-Stimmen. Enthaltungen zählen nicht. Bei Gleichstand ist
  der Antrag abgelehnt (§ 56 Abs. 2 KVG LSA, § 15 Abs. 3 GO). Abweichungen sind nur zulässig, wenn
  ein Gesetz sie vorschreibt oder, in Verfahrensfragen, die Geschäftsordnung.
- **Die einzige Ausnahme, die in unseren Daten häufig vorkommt:** die **Erweiterung der
  Tagesordnung** (§ 6 Abs. 3 GO). Sie braucht **zwei Drittel der anwesenden Mitglieder**, und die
  Niederschriften wenden das tatsächlich an: TOP 2.1 vom 27.08.2026 „Stadtschreiberstipendium für
  2027 umsetzen“ ist mit 29:16:0 **abgelehnt** worden, obwohl mehr Ja- als Nein-Stimmen abgegeben
  wurden.
- **Seltene Fälle mit erhöhtem Erfordernis:**
  - Mehrheit der Mitglieder: Hauptsatzung, Geschäftsordnung, Abwahl des Vorsitzenden.
  - Zwei Drittel der Mitglieder: Ehrenbürgerrecht, Ratsbürgerentscheid.
  - Drei Viertel der Mitglieder: Abwahl der Oberbürgermeisterin oder der Beigeordneten, Selbstauflösung.
  - Mehrheit der anwesenden stimmberechtigten Mitglieder: Wahlen und Bestellungen von Personen durch
    Abstimmung (§ 56 Abs. 4 und 6 KVG LSA), z. B. Beigeordnete, Entsendungen, Schiedspersonen.
  - Mehrheit der anwesenden Mitglieder: Absetzen oder Verschieben eines TOP (§ 6 Abs. 4 GO).
- **Gesetzliche Mitgliederzahl:** 56 Stadträte (§ 37 Abs. 1 KVG LSA, Einwohnerklasse 150 001 bis
  300 000) **plus die Oberbürgermeisterin**, also **57**. Die Oberbürgermeisterin ist Mitglied der
  Vertretung und stimmberechtigt (§ 36 Abs. 1, § 56 Abs. 1 KVG LSA). Die Niederschriften führen „Soll
  56 Stadträtinnen/Stadträte, Oberbürgermeisterin 1“. Jede Abstimmung in unseren Scans hat 57
  Stimmen.
- **Minderheitenrechte** (ein Viertel, ein Fünftel, ein Zehntel, eine Fraktion) sind **keine
  Mehrheitserfordernisse einer Abstimmung**. Wird das Quorum erreicht, besteht der Anspruch ohne
  Ratsbeschluss. Das gilt z. B. für die Akteneinsicht nach § 45 Abs. 6 KVG LSA. Werden sie trotzdem
  zur Abstimmung gestellt, entscheidet das Abstimmungsergebnis rechtlich nicht über den Anspruch.
- **Erkennbarkeit:** Am Typ `Tagesordnung` allein ist das 2/3-Erfordernis **nicht** erkennbar. Unter
  diesem Typ stehen Bestätigung, Erweiterung, Zurückstellung und Rücküberweisung. Erkennbar ist es nur:
  - am Titel „Erweiterung der Tagesordnung“ (teils mit „bei 2/3 Mehrheit“) oder
  - an Abstimmungen unter TOP 2.x mit dem Titel einer Drucksache (das ist die Abstimmung über die
    Aufnahme dieser Drucksache).

  „Änderung der Tagesordnung“ ist mehrdeutig. In den geprüften Fällen war es eine Zurückstellung oder
  Rücküberweisung, also **keine** 2/3-Abstimmung.

## Tabelle: Erfordernis × Bezugsgröße × Auslöser × Quelle

„Mitglieder“ meint die Mitglieder der Vertretung einschließlich der Oberbürgermeisterin (§ 36 Abs. 1
KVG LSA). Die Schwellen in Spalte 3 habe ich selbst für 57 gesetzliche Mitglieder ausgerechnet und
aufgerundet. Sie stehen so nicht in den Quellen (siehe „Offene Punkte“ zur Bezugsgröße bei
Vakanzen).

| Erfordernis | Bezugsgröße | Schwelle (57 Mitglieder) | Auslöser | Erkennbar in unseren Daten? | Quelle |
|---|---|---|---|---|---|
| Einfache Mehrheit (Regelfall) | Ja > Nein; Enthaltungen und Nichtabstimmende zählen nicht | Ja > Nein | Alle Beschlüsse, soweit nichts anderes bestimmt ist: Beschlussvorlagen, Anträge, Änderungsanträge, GO-Anträge (§ 14 GO, z. B. Überweisung, Rücküberweisung, Vertagung), Bestätigung der Tagesordnung, Niederschrift, Widerspruch der OB (§ 65 Abs. 3 KVG LSA, keine Sonderregel) | Standardannahme für alle Typen | § 56 Abs. 2 S. 3 KVG LSA; § 15 Abs. 3 S. 1 GO |
| Gleichstand | – | Ja = Nein ⇒ abgelehnt | Jede Abstimmung | – | § 56 Abs. 2 S. 4 KVG LSA; § 15 Abs. 3 S. 4 GO |
| **Zwei Drittel der anwesenden Mitglieder** | Anwesende Mitglieder (incl. OB, Enthaltende und anwesend Nichtabstimmende); Ja ≥ ⅔ · anwesend | z. B. 45 anwesend ⇒ 30 Ja | **Erweiterung der Tagesordnung** zu Sitzungsbeginn nach Begründung der Dringlichkeit | Typ `Tagesordnung` + Titel „Erweiterung der Tagesordnung …“ **oder** Typ `Tagesordnung`, TOP 2.x/3.x, Titel = Titel einer Drucksache (meist mit `motionId`) | § 6 Abs. 3 GO (Grundlage für die Abweichung: § 56 Abs. 2 S. 3 KVG LSA „in Angelegenheiten des Verfahrens die Geschäftsordnung“) |
| Mehrheit der anwesenden Mitglieder | Anwesende Mitglieder; Ja > ½ · anwesend (Enthaltungen wirken wie Nein) | z. B. 46 anwesend ⇒ 24 Ja | Absetzen eines TOP von der Tagesordnung oder Einordnen an anderer Stelle (Absetzen zusätzlich nur mit Zustimmung des Einbringenden) | Typ `Tagesordnung`, Titel „Zurückstellung/Zurückziehung …“, teils „Änderung der Tagesordnung“; nicht trennscharf von GO-Anträgen nach § 14 GO (einfache Mehrheit) | § 6 Abs. 4 GO |
| Mehrheit der anwesenden stimmberechtigten Mitglieder (1. Wahlgang) | Anwesende Stimmberechtigte; Enthaltungen und ungültige Stimmen wirken wie Nein | z. B. 46 anwesend ⇒ 24 | **Wahlen** und **Bestellungen von Personen durch Abstimmung** (z. B. Beigeordnete, Entsendungen in Gremien, Wiederwahl Schiedsperson). Im 2. Wahlgang reichen die meisten Stimmen, bei Gleichstand entscheidet das Los. Hat nur eine Person kandidiert, gibt es keinen 2. Wahlgang | Titel mit „Wahl“, „Entsendung“, „Bestellung“, „Benennung“; Typ meist `Sonstige`, teils `Geschäftsordnung` | § 56 Abs. 4 und 6 KVG LSA; § 16 Abs. 3 GO; § 12 Abs. 1 Hauptsatzung (Beigeordnete) |
| Mehrheit der Mitglieder | Gesetzliche Mitgliederzahl | 29 | Erlass oder Änderung der **Hauptsatzung**; Erlass der **Geschäftsordnung**; **Abwahl des Vorsitzenden** oder seiner Stellvertreter; Bildung zeitweiliger Ausschüsse | Titel „Hauptsatzung“, „Geschäftsordnung des Stadtrates“, „Änderungssatzung der Hauptsatzung“ | § 10 Abs. 2, § 59, § 36 Abs. 2 S. 2 KVG LSA; § 6 Abs. 4 Hauptsatzung |
| Mehrheit der ehrenamtlichen Mitglieder | 56 Stadträte, **ohne** OB | 29 | Bestellung des gewählten HVB nach Wahleinspruch | Praktisch nie | § 74 KVG LSA |
| Zwei Drittel der Mitglieder | Gesetzliche Mitgliederzahl | 38 | Verleihung oder Aberkennung des **Ehrenbürgerrechts**; **Ratsbürgerentscheid** | Titel „Ehrenbürger“, „Bürgerentscheid“ | § 17 Hauptsatzung i. V. m. § 22 Abs. 4 KVG LSA; § 27 Abs. 2 KVG LSA |
| Zwei Drittel der Mitglieder (Einverständnis) | Mitglieder | 38 | Schriftliches oder elektronisches Abstimmungsverfahren in einer festgestellten Notsituation | Nur Pandemie-Sonderfall | § 56a Abs. 3 KVG LSA; § 26 Abs. 6 GO |
| Drei Viertel der Mitglieder (nicht an der Mitwirkung gehindert) | Mitglieder ohne Mitwirkungsverbot | 43 (bei 57) | **Einleitung der Abwahl der OB** (Antrag von mindestens ⅔ nötig) | Praktisch nie | § 64 Abs. 1 KVG LSA |
| Drei Viertel der Mitglieder | Mitglieder | 43 | **Abwahl von Beigeordneten** (Antrag von mindestens ⅔); **Selbstauflösung** der Vertretung nach Wahlfälschung | Praktisch nie | § 69 Abs. 3, § 38 Abs. 3 KVG LSA |
| Kein Widerspruch | Alle Stimmberechtigten | 0 Widersprüche | Beschluss über Gegenstände einfacher Art im Offenlegungs- oder Umlaufverfahren | Kommt in unseren Daten nicht vor | § 54 S. 2–3 KVG LSA |
| *Minderheitenrecht:* ein Viertel der Mitglieder oder eine Fraktion | Mitglieder | 15 | Gegenstand auf die Tagesordnung spätestens der übernächsten Sitzung setzen; unverzügliche Einberufung (nur ein Viertel) | Keine Abstimmung nötig | § 53 Abs. 5 KVG LSA; § 5 Abs. 3, § 6 Abs. 2 GO |
| *Minderheitenrecht:* ein Fünftel der Mitglieder, eine Fraktion oder der Vorsitzende | Mitglieder | 12 | Nicht vorberatene Anträge müssen in den beschließenden Ausschuss überwiesen werden | Keine Abstimmung nötig | § 48 Abs. 3 S. 2 KVG LSA |
| *Minderheitenrecht:* ein Zehntel der **ehrenamtlichen** Mitglieder (mindestens 2) oder eine Fraktion | 56 Stadträte | 6 | Unterrichtung durch die OB; **Akteneinsicht** („ist … zu gewähren“) | Titel „Akteneinsicht gemäß § 45 Absatz 6 …“, Typ `Antrag` oder (bei Aufnahme in die Tagesordnung) `Tagesordnung` | § 45 Abs. 6 KVG LSA |

Zum Vergleich, keine Abstimmungsmehrheit: **Beschlussfähigkeit** liegt vor, wenn die Mehrheit der
stimmberechtigten Mitglieder anwesend ist (29 von 57). Sie wird zu Sitzungsbeginn festgestellt und
gilt fort, bis jemand die Beschlussunfähigkeit rügt (§ 55 Abs. 1 KVG LSA).

## Wer zählt als „anwesend“?

- **Oberbürgermeisterin:** zählt mit. Sie ist Mitglied der Vertretung und hat Stimmrecht (§ 36
  Abs. 1 S. 2, § 56 Abs. 1 S. 2 KVG LSA). Ausgenommen sind nur Bezugsgrößen, die ausdrücklich
  „ehrenamtliche Mitglieder“ nennen (§ 45 Abs. 6, § 74 KVG LSA).
- **Enthaltende:** sind anwesend. Bei „Mehrheit der auf Ja oder Nein lautenden Stimmen“ zählen sie
  nicht mit. Bei allen Bezugsgrößen mit „anwesend“ erhöhen sie die Schwelle und wirken damit wie eine
  Nein-Stimme. Das folgt aus dem Wortlaut. Eine Legaldefinition von „anwesend“ gibt es weder im KVG
  LSA noch in der GO.
- **Anwesende ohne Stimmabgabe:** zählen nach dem Wortlaut ebenfalls zu den Anwesenden. Unsere
  Stimme `O` trennt sie nicht von Abwesenden.
- **Mitglieder mit Mitwirkungsverbot (§ 33 KVG LSA):** verlassen den Sitzungsbereich und dürfen
  sich im Zuhörerbereich aufhalten (§ 1 Abs. 9 GO). Sie zählen also nicht als anwesende Mitglieder.
  Das ist eine Folgerung, kein ausdrücklicher Satz. § 55 Abs. 3 KVG LSA spricht von „ihrer
  Anwesenheit oder Mitwirkung entgegensteht“. Die Niederschrift führt eine Spalte „Befangen“.
- **Zugeschaltete Mitglieder bei Hybridsitzungen** gelten als anwesend (§ 56b Abs. 1 S. 5 KVG LSA).
  Die geltende Hauptsatzung lässt Hybridsitzungen für den Stadtrat nicht zu. Der Entwurf der
  Neufassung DS0014/26 sieht sie nur für Ausschüsse vor (§ 10a).

**So rechnet die Stadt in der Praxis (Niederschriften):**

| Sitzung | Gegenstand | Stimmen (J:N:E) | Amtliches Ergebnis | Unsere Daten (`O`) |
|---|---|---|---|---|
| 27.08.2026 | Erweiterung um DS0353/26 | 45:0:0 | „zugestimmt bei 2/3 Mehrheit als TOP 6.39“ | 12 |
| 27.08.2026 | Erweiterung um A0178/26 | 43:0:0 | „zugestimmt bei 2/3 Mehrheit als TOP 7.50“ | 14 |
| 27.08.2026 | Erweiterung um A0176/26 „Stadtschreiberstipendium“ | 29:16:0 | **abgelehnt** | 12 |
| 27.08.2026 | Erweiterung um A0177/26 | 3:29:13 | abgelehnt | 12 |
| 21.05.2026 | Aufnahme A0113/26 „Akteneinsicht gemäß § 45 Abs. 6 …“ | 27:16:3 | „findet keine 2/3 Mehrheit und wird … abgelehnt“ | 11 |
| 24.04.2025 | Aufnahme A0095/25 | 13:23:2 | „fand keine 2/3 Mehrheit … abgelehnt“ | 19 |
| 21.05.2026 | Rücküberweisung TOP 6.21 in den StBV („Änderung der Tagesordnung“) | 24:19:3 | zugestimmt (einfache Mehrheit, kein 2/3-Fall) | 11 |
| 26.02.2026 | Zurückstellung A0226/25 („Änderung der Tagesordnung“, 29:7:11) | – | „mehrheitlich zugestimmt“ (kein 2/3-Fall) | – |

Der Fall vom 27.08.2026 zeigt: Die Stadt misst die zwei Drittel nicht an Ja gegen Nein. 29 von 45
abgegebenen Stimmen sind 64 %, also weniger als zwei Drittel. Ob die Stadt als Bezugsgröße „J+N+E“
nimmt oder die tatsächlich anwesenden Mitglieder einschließlich der Nichtabstimmenden, lässt sich an
diesen Fällen nicht unterscheiden. Laut Niederschrift waren in der Sitzung zeitweise bis zu 50 von
56 Stadträten anwesend. Die Anwesenheit zum Zeitpunkt der Abstimmung steht dort nicht. Bei allen
geprüften Fällen führen beide Lesarten zum selben Ergebnis.

Folgerung für die Map #616: Zwei der drei in #616 genannten Beispiele sind **keine**
2/3-Abstimmungen, nämlich 21.05.2026 TOP 2.1 „Änderung der Tagesordnung“ (24:19:3) und 26.02.2026
TOP 2 „Änderung der Tagesordnung“ (29:7:11). Es waren eine Rücküberweisung und eine Zurückstellung
mit einfacher Mehrheit, also zu Recht angenommen. Das dritte Beispiel (27.08.2026,
Stadtschreiberstipendium) ist ein echter Fehler in unseren Daten.

## Quellen und Fassungen

- **KVG LSA**: Kommunalverfassungsgesetz des Landes Sachsen-Anhalt vom 17. Juni 2014 (GVBl. LSA
  S. 288), Stand: zuletzt geändert durch Art. 1 des Gesetzes vom 17. Dezember 2025 (GVBl. LSA S. 834).
  Gesamtausgabe auf [landesrecht.sachsen-anhalt.de](https://www.landesrecht.sachsen-anhalt.de/bsst/document/jlr-NNLST00004167),
  abgerufen am 2026-11-03. Gültig ab laut Inhaltsverzeichnis:
  - § 10, § 33, § 45, § 53, § 59, § 65: 01.07.2024
  - § 22, § 36, § 37, § 48, § 55, § 64: 01.07.2014
  - § 27, § 74: 01.07.2018
  - § 38: 27.04.2023
  - § 54, § 56: 10.11.2020
  - § 56a: 26.03.2021
  - § 69: 22.06.2018
- **Geschäftsordnung des Stadtrates der Landeshauptstadt Magdeburg** in der Fassung des Beschlusses
  vom 15.07.2021 (in Kraft mit Beschlussfassung, löst die GO vom 18.02.2021 ab, § 28).
  [PDF auf magdeburg.de](https://www.magdeburg.de/media/custom/698_8487_1.PDF), dort als aktuelle GO
  verlinkt. Das PDF ist ein Scan, „§“ erscheint im OCR-Text teils als „8“. Der einzige spätere
  Änderungsantrag A0013/24 wurde am 15.02.2024 zurückgezogen
  ([Beratungen](https://ratsinfo.magdeburg.de/vo0053.asp?__kvonr=242975)). Am 08.07.2024 hat der
  neue Stadtrat die Gültigkeit der GO bestätigt (konstituierende Sitzung, TOP 7 in unseren Daten).
- **Hauptsatzung der Landeshauptstadt Magdeburg**, Lesefassung der Bekanntmachung vom 16.02.2016,
  zuletzt geändert durch die Dritte Änderungssatzung vom 28.02.2022.
  [PDF auf magdeburg.de](https://www.magdeburg.de/PDF/Lesefassung_der_Hauptsatzung_der_Landeshauptstadt_Magdeburg.PDF?ObjSvrID=37&ObjID=20300&ObjLa=1&Ext=PDF&WTR=1).
  Relevant sind § 6 Abs. 4 (zeitweilige Ausschüsse), § 12 Abs. 1 (Beigeordnete) und § 17
  (Ehrenbürger). Eine **Neufassung (DS0014/26)** ist in Beratung
  ([Vorlage](https://ratsinfo.magdeburg.de/vo0050.asp?__kvonr=248037)). Die Ausschüsse haben sie im
  April und Mai 2026 nicht empfohlen, ein Stadtratsbeschluss steht laut Ratsinfo aus. Der Entwurf
  übernimmt die Ehrenbürger-Regel unverändert (dort § 16) und ergänzt Hybridsitzungen für Ausschüsse
  (§ 10a).
- **Niederschriften** (Ratsinformationssystem):
  - [27.08.2026](https://ratsinfo.magdeburg.de/getfile.asp?id=750814&type=do)
  - [21.05.2026](https://ratsinfo.magdeburg.de/getfile.asp?id=744528&type=do)
  - [26.02.2026](https://ratsinfo.magdeburg.de/getfile.asp?id=738820&type=do)
  - [24.04.2025](https://ratsinfo.magdeburg.de/getfile.asp?id=717456&type=do)

  Jeweils TOP 1 (Anwesenheit: „Soll 56 Stadträtinnen/Stadträte, Oberbürgermeisterin 1“) und TOP 2
  (Tagesordnung).

## Offene Punkte

1. **Bezugsgröße „anwesend“ in der Praxis.** Die Stadt könnte „J+N+E“ zugrunde legen oder alle
   anwesenden Mitglieder einschließlich der Nichtabstimmenden. Das ist offen und gehört zu #618
   (Screenshot und Niederschrift). Am Screenshot ist es nicht zu unterscheiden, weil `O` beides
   umfasst.
2. **„Mitglieder der Vertretung“ bei Vakanzen.** Das KVG LSA sagt nicht ausdrücklich, ob die
   gesetzliche oder die tatsächliche Mitgliederzahl gemeint ist. Nur § 42 Abs. 5 spricht von der
   „gesetzlichen Mitgliederzahl“. Die Schwellen 29, 38 und 43 setzen 57 voraus. Kommentarliteratur ist
   keine Primärquelle und wurde nicht herangezogen.
3. **„Mehrheit von zwei Dritteln“ = mindestens ⅔.** Ich lese das als Ja ≥ ⌈⅔ · n⌉. Die Quellen
   rechnen das nicht vor. Die Fälle in den Niederschriften widersprechen dieser Lesart nicht.
4. **Ältere Fassungen.** Unsere Daten reichen bis 2019 zurück (Wahlperiode 7). Nicht geprüft habe ich
   die GO-Fassungen vor dem 15.07.2021 (DS0231/19 von 2019, Änderung vom 18.02.2021) und die Fassung
   von § 45 Abs. 6 KVG LSA vor dem 01.07.2024. § 6 Abs. 3 GO stand vermutlich schon früher so in der
   GO, belegt ist das aber nicht.
5. **Ehrenbezeichnungen.** § 17 der Hauptsatzung verlangt ⅔ nur für das Ehrenbürgerrecht. Ob die
   Ehrenbürgersatzung für Ehrenbezeichnungen (z. B. „Ehrenbotschafter“, 19.06.2025 TOP 5.20) eine
   eigene Mehrheit vorsieht, ist nicht geprüft.
6. **Typ-Zuordnung.** Wahlen und Bestellungen stehen in unseren Scans teils unter `Geschäftsordnung`
   (z. B. 10.11.2022 „Wahl … Beigeordneten“, möglicherweise ein GO-Antrag zur Wahl, nicht die Wahl selbst). Für
   Wahlen und Bestellungen gilt die Mehrheit der Anwesenden, nicht
   Ja > Nein. Ob sich das am Titel zuverlässig erkennen lässt, gehört zu #620.
