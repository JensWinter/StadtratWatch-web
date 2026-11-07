# StadtratWatch API v1 Dokumentation

Die StadtratWatch API v1 bietet Zugang zu strukturierten Daten über Stadtratssitzungen, Abstimmungen und Redebeiträge. Alle Endpunkte geben JSON-Daten zurück und stehen unter der CC0 1.0 Lizenz.

## Basis-URL

```
/api/v1/
```

## Authentifizierung

Die API benötigt keine Authentifizierung. Alle Endpunkte sind öffentlich zugänglich.

## Antwortformat

Alle API-Antworten folgen diesem grundlegenden Format:

```json
{
  "meta": {
    "stadtratwatch_api": {
      "version": "1.0",
      "license": "CC0 1.0",
      "license_url": "https://creativecommons.org/publicdomain/zero/1.0/"
    }
  },
  "data": [...] // oder andere Datenfelder
}
```

## Endpunkte

### 1. Legislaturperioden auflisten

```
GET /api/v1/parliament-periods.json
```

Gibt eine Liste aller verfügbaren Legislaturperioden zurück.

**Antwort:**

```json
{
  "meta": { ... },
  "data": [
    {
      "id": "magdeburg-7",
      "name": "Wahlperiode VII",
      "lastUpdate": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Felder:**

- `id`: Eindeutige ID der Legislaturperiode
- `name`: Anzeigename der Legislaturperiode
- `lastUpdate`: Zeitstempel der letzten Aktualisierung

### 2. Einzelne Legislaturperiode abrufen

```
GET /api/v1/parliament-periods/{parliamentPeriodId}.json
```

Gibt detaillierte Informationen zu einer spezifischen Legislaturperiode zurück.

**Parameter:**

- `parliamentPeriodId`: ID der Legislaturperiode (z.B. "magdeburg-7")

**Antwort:**

```json
{
  "meta": { ... },
  "parliamentPeriod": {
    "id": "magdeburg-7",
    "name": "Wahlperiode VII",
    "sessions": [...],
    "persons": [...],
    "factions": [...],
    "lastUpdate": "2024-01-15T10:30:00Z"
  }
}
```

### 3. Redebeiträge einer Sitzung abrufen

```
GET /api/v1/parliament-periods/{parliamentPeriodId}/speeches/{sessionId}.json
```

Gibt alle Redebeiträge einer spezifischen Stadtratssitzung zurück.

**Parameter:**

- `parliamentPeriodId`: ID der Legislaturperiode
- `sessionId`: ID der Sitzung

**Antwort:**

```json
{
  "meta": { ... },
  "data": [
    {
      "personId": "max-mustermann",
      "speaker": "Max Mustermann",
      "start": "00:15:30",
      "duration": "00:03:45",
      "onBehalfOf": "Ausschuss für Stadtentwicklung, Bauen und Verkehr",
      "transcription": "Meine Damen und Herren, ich möchte zu diesem Punkt folgendes sagen...",
      "aiTextAssessmentLabel": "Mixed"
    }
  ]
}
```

**Felder:**

- `personId`: ID der sprechenden Person (kann `null` sein)
- `speaker`: Name der sprechenden Person
- `start`: Startzeit des Redebeitrags im Video in Sekunden
- `duration`: Dauer des Redebeitrags in Sekunden
- `onBehalfOf`: Name des Gremiums, für das die Person spricht (bspw. ein Ausschuss, optional)
- `transcription`: Transkription des Redebeitrags
- `aiTextAssessmentLabel`: Ergebnis der Prüfung auf KI-generierten Text, entweder `"AI"` oder `"Mixed"` (optional). Das Feld ist nur vorhanden, wenn der Redebeitrag mit hoher Wahrscheinlichkeit KI-generierte Textanteile enthält und die Bewertung zur aktuellen Transkription passt; andernfalls fehlt es vollständig. Zur Methodik siehe https://www.stadtratwatch.de/transparency/ai-assessment/

**Hinweise:**

- Nur Redebeiträge mit verfügbaren Transkriptionen werden zurückgegeben
- Redebeiträge der Sitzungsleitung werden herausgefiltert
- personId kann `null` sein. Das kann der Fall sein, wenn der Redebeitrag von einer Person stammt, die kein Stadtratsmitglied ist. Bspw. eine Beigeordnete oder wenn Person auf Einladung des Stadtrats spricht.

### 4. Abstimmungen einer Sitzung abrufen

```
GET /api/v1/parliament-periods/{parliamentPeriodId}/votings/{sessionId}.json
```

Gibt alle Abstimmungen einer spezifischen Stadtratssitzung zurück.

**Parameter:**

- `parliamentPeriodId`: ID der Legislaturperiode
- `sessionId`: ID der Sitzung

**Antwort:**

```json
{
  "meta": { ... },
  "data": [
    {
      "id": 1,
      "videoTimestamp": 1800,
      "votingSubject": "Antrag zur Verkehrsberuhigung in der Innenstadt",
      "votes": [
        {
          "personId": "person-123",
          "vote": "yes"
        },
        {
          "personId": "person-456",
          "vote": "no"
        }
      ]
    }
  ]
}
```

**Felder:**

- `id`: Eindeutige ID der Abstimmung. (Eindeutigkeit innerhalb der Sitzung)
- `videoTimestamp`: Zeitstempel im Video in Sekunden
- `votingSubject`: Beschreibung des Abstimmungsthemas
- `votes`: Array mit den einzelnen Stimmen

**Abstimmungsoptionen:**

- `yes`: Ja-Stimme
- `no`: Nein-Stimme
- `abstain`: Enthaltung
- `no_show`: Nicht abgestimmt

## Fehlerbehandlung

### 404 - Nicht gefunden

Wenn eine angeforderte Ressource nicht existiert:

```json
{
  "status": 404,
  "statusText": "Session speeches not found"
}
```

## Beispiele

### Alle Legislaturperioden abrufen

```bash
curl -X GET https://www.stadtratwatch.de/api/v1/parliament-periods.json
```

### Redebeiträge einer Sitzung abrufen

```bash
curl -X GET https://www.stadtratwatch.de/api/v1/parliament-periods/magdeburg-7/speeches/2024-05-02.json
```

### Abstimmungen einer Sitzung abrufen

```bash
curl -X GET https://www.stadtratwatch.de/api/v1/parliament-periods/magdeburg-7/votings/2024-05-02.json
```

## Lizenz

Alle über diese API bereitgestellten Daten stehen unter der CC0 1.0 Lizenz (Public Domain). Sie können die Daten frei verwenden, kopieren, verändern und verbreiten.
