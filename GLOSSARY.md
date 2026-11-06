# StadtratWatch

Beobachtung des Magdeburger Stadtrats: Sitzungen, Abstimmungen und Redebeiträge werden aus Videos und OParl-Daten aufbereitet und als statische Website veröffentlicht.

## Language

### Abstimmungen

**Stimme**:
Das, was ein Ratsmitglied in einer Abstimmung abgibt: Ja, Nein, Enthaltung oder nicht abgestimmt. „Nicht abgestimmt“ umfasst Abwesenheit und Anwesenheit ohne Stimmabgabe, weil der Screenshot der Abstimmung beides für das einzelne Ratsmitglied nicht unterscheiden kann.
_Avoid_: Votum, Vote (außer im Code), Abstimmungsverhalten

**Mehrheitserfordernis**:
Die Mehrheit, die eine Abstimmung braucht, um angenommen zu sein. Im Regelfall die einfache Mehrheit (mehr Ja- als Nein-Stimmen, Enthaltungen zählen nicht); für bestimmte Abstimmungen schreibt die Geschäftsordnung eine qualifizierte Mehrheit vor, etwa zwei Drittel der anwesenden Mitglieder bei der Erweiterung der Tagesordnung.
_Avoid_: Quorum, Mehrheitsregel, Schwelle

**Bezugsgröße**:
Die Zahl, an der ein Mehrheitserfordernis gemessen wird: die Ja- und Nein-Stimmen, die anwesenden Mitglieder oder die gesetzliche Mitgliederzahl.
_Avoid_: Basis, Grundgesamtheit

**Anwesende Mitglieder**:
Die Zahl der Mitglieder, die bei einer Abstimmung anwesend sind, wie der Abstimmungsbildschirm sie als „Anwesend“ anzeigt. Sie schließt Enthaltende und Anwesende ohne Stimmabgabe ein und kann sich im Lauf einer Sitzung ändern.
_Avoid_: Anwesenheit (für die Zahl), abgegebene Stimmen

**Gesetzliche Mitgliederzahl**:
Die Zahl der Sitze im Stadtrat einschließlich der Oberbürgermeisterin, in Magdeburg 57. Ein unbesetzter Sitz senkt sie nicht.
_Avoid_: Mitgliederzahl (ohne Zusatz), Ratsgröße

**Abstimmungsergebnis**:
Angenommen oder abgelehnt. Eine Abstimmung ist angenommen, wenn ihre Stimmen das Mehrheitserfordernis der Abstimmung erfüllen.
_Avoid_: Ergebnis (ohne Zusatz), Voting-Ergebnis

**Antragsergebnis**:
Angenommen, teilweise angenommen oder abgelehnt. Ein Antrag mit mehreren Abstimmungen ist teilweise angenommen, wenn nur ein Teil seiner Abstimmungen angenommen ist.
_Avoid_: Antragserfolg, Motion-Ergebnis

### Redebeiträge

**Redebeitrag**:
Ein zusammenhängender Wortbeitrag einer Person in einer Sitzung, identifiziert durch Sitzung und Startzeitpunkt; sein Text ist das maschinell erstellte, von Hand korrigierte Transkript.
_Avoid_: Rede, Speech (außer im Code), Wortmeldung

**KI-Einschätzung**:
Das Ergebnis eines KI-Textdetektors für den Text eines Redebeitrags: Label (KI / gemischt / menschlich), Konfidenz und Anteilswerte, zusammen mit der Modellversion und dem Prüfdatum. Eine probabilistische Einschätzung, kein Beweis.
_Avoid_: KI-Verdacht, KI-Score, GenAI-Check, AI detection (außer im Code: `AiTextAssessment`)

**Ausgewählter Redebeitrag**:
Ein Redebeitrag, den die Redaktion gezielt für eine KI-Einschätzung ausgewählt hat. Nicht alle Redebeiträge einer Sitzung werden eingeschätzt.
_Avoid_: geprüfter Beitrag, gescannter Beitrag

**Kontrollkorpus**:
Eine Menge von Redebeiträgen aus der Zeit vor generativer KI (vor 2023), an der die Fehlalarmquote des Detektors auf diesem Textmaterial gemessen wird, bevor KI-Einschätzungen veröffentlicht werden.
_Avoid_: Testdaten, Baseline, Referenzmenge
