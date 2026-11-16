# Rahmenbedingungen für einen eigenständigen OParl-Scraper

Datum: 2026-11-16
Ticket: [#672](https://github.com/JensWinter/StadtratWatch-web/issues/672) der Wayfinder-Map
[#669](https://github.com/JensWinter/StadtratWatch-web/issues/669)
Frage: Welche äußeren Rahmenbedingungen gelten für einen eigenständig betriebenen OParl-Scraper, der einen offenen
Datensatz (OParl-Snapshot) veröffentlicht? Lizenz, Laufzeitumgebung, Veröffentlichungsort.

Keine Rechtsberatung. Abrufe der Live-API am 2026-11-16 (fünf GET-Anfragen mit Pause).

## Fazit

1. **Lizenz:** Das Magdeburger OParl-System gibt `license: https://www.govdata.de/dl-de/zero-2-0` an. Nach der
   OParl-Spezifikation gilt das für alle Objekte des Systems, solange ein Objekt nichts anderes angibt; kein
   geprüftes Objekt tut das. Die JSON-Daten dürfen also ohne Bedingungen, auch ohne Namensnennung, weiterveröffentlicht
   werden. Für die PDFs gilt formal dieselbe Lizenz (kein `fileLicense`), sie können aber Rechte Dritter und
   personenbezogene Daten enthalten. Die PDFs sind daher das Restrisiko, nicht die JSON-Daten.
2. **Laufzeit:** GitHub Actions trägt den inkrementellen Scrape gut (öffentliches Repo: kostenlos). Ein Voll-Scrape
   liegt mit rund 7.300 Listenseiten und 2 s Pause bei über 4 Stunden, nah am Job-Limit von 6 Stunden, und wächst mit
   jedem Jahr. Er muss aufgeteilt werden (z. B. ein Job je Objekttyp) oder woanders laufen. Geplante Workflows in
   öffentlichen Repos werden nach 60 Tagen ohne Repo-Aktivität abgeschaltet.
3. **Veröffentlichung:** Für häufige Aktualisierung passen S3/CloudFront (vorhanden) oder GitHub Releases. Zitierbar
   mit DOI ist nur Zenodo; dort ist jede Version ein neuer Datensatz mit eigener DOI, eher für wöchentliche oder
   monatliche Stände. Open-Data-Portale (GovData, Magdeburg) nehmen keine Daten von Privaten bzw. Vereinen an.

## 1. Lizenz

### Live-API

| Objekt                                                       | `license`                              | Weitere Felder                                    |
| ------------------------------------------------------------ | -------------------------------------- | ------------------------------------------------- |
| System `https://ratsinfo.magdeburg.de/oparl/system`          | `https://www.govdata.de/dl-de/zero-2-0` | `contactEmail: info@magdeburg.de`, Hersteller SOMACOS |
| Body `https://ratsinfo.magdeburg.de/oparl/bodies/0001`       | fehlt                                  | `licenseValidSince: 2017-01-31T00:00:00+02:00`    |
| Paper (erste Listenseite, 25 Stück)                          | fehlt                                  |                                                   |
| File `…/files/756331` und 25 eingebettete Files              | fehlt                                  | kein `fileLicense`, kein `size`                   |

Gegenprobe im lokalen Rohbestand (Scrape vom 2026-10-24): keines der 14.537 Paper und 33.649 File-Objekte hat
`license` oder `fileLicense`.

### OParl-Spezifikation 1.1

Quelle: [Online-Ansicht der Spezifikation](https://oparl.org/spezifikation/online-ansicht/).

- 3.3.4 `license`: Steht `license` am System- oder Body-Objekt, werden alle Objekte des Systems bzw. der Körperschaft
  unter dieser Lizenz veröffentlicht, „sofern nicht das einzelne Objekt eine anders lautende Lizenz-URL angibt“.
  Empfohlen wird, die Lizenz global am System anzugeben.
- 3.14 File, `fileLicense`: Fehlt die Eigenschaft, ist `license` des Objekts bzw. die Lizenz eines übergeordneten
  Objekts maßgeblich.
- 3.5 Body, `licenseValidSince`: warnt vor Lizenzwechseln zu restriktiveren Bedingungen.
- 1.6 Datenschutz: personenbezogene Daten brauchen in der Regel die Zustimmung der Betroffenen; genannt sind E-Mail,
  Anschriften, Fotos, Anwesenheitslisten.
- 2.8 Gelöschte Objekte: Server löschen weich (`deleted: true`), damit Clients Löschungen nachziehen können.

Folge für einen allgemeinen Scraper: Die Lizenz steht in Magdeburg am System, nicht am Body. Der Scraper muss sie je
Objekt über Objekt → Body → System auflösen und im Snapshot mitliefern.

### Datenlizenz Deutschland – Zero – 2.0

Quelle: [govdata.de/dl-de/zero-2-0](https://www.govdata.de/dl-de/zero-2-0). Jede Nutzung ist ohne Einschränkungen
oder Bedingungen zulässig, kommerziell und nicht kommerziell: vervielfältigen, verändern, an Dritte weitergeben, mit
anderen Daten zusammenführen. Eine Namensnennung ist nicht verlangt.

### Impressum und Urheberrecht

- Das Ratsinformationssystem (SOMACOS Session) hat keine eigenen Nutzungsbedingungen; es verlinkt Impressum und
  Datenschutz von magdeburg.de.
- [Impressum magdeburg.de](https://www.magdeburg.de/Start/B%C3%BCrger-Stadt/System/Impressum-), „Urheberrecht“:
  Inhalte sind geschützt, Weiterverwendung nur privat, öffentliche Verwendung nur mit Zustimmung. Ausgenommen sind
  „die offiziellen Informationen und Mitteilungen der Stadt Magdeburg“, die frei weiterverwendbar sind. Einzelne
  Inhalte können eigene Vermerke tragen.
- [§ 5 UrhG](https://www.gesetze-im-internet.de/urhg/__5.html): Amtliche Bekanntmachungen und Erlasse sind
  gemeinfrei (Abs. 1); andere amtliche Werke, die zur allgemeinen Kenntnisnahme veröffentlicht werden, ebenfalls,
  aber mit Änderungsverbot und Pflicht zur Quellenangabe (Abs. 2).

### Bewertung

- **JSON-Daten:** Die ausdrückliche, maschinenlesbare Lizenz der Schnittstelle ist spezifischer als das allgemeine
  Impressum. Weiterveröffentlichung als offener Datensatz ist gedeckt.
- **PDFs:** Formal über die Vererbung ebenfalls DL-DE Zero. Die Stadt kann aber nur Rechte vergeben, die sie hat.
  Anlagen können Werke Dritter enthalten (Gutachten, Pläne, Fotos, Anträge von Fraktionen), dazu Namen und andere
  personenbezogene Daten. Zieht die Stadt ein Dokument zurück oder schwärzt es, bleibt die Kopie im Datensatz
  bestehen. Vorschlag: bei der Stadt (Kontakt laut System-Objekt: info@magdeburg.de) schriftlich bestätigen lassen,
  dass die Lizenz auch die Dateien umfasst, oder die PDFs zunächst nicht in den Datensatz aufnehmen (nur
  `downloadUrl` verlinken).
- Das Open-Data-Angebot der Stadt hat eigene Nutzungsbedingungen; die Seite ließ sich nicht statisch abrufen. Sie
  betrifft die OParl-Daten nicht, weil die Schnittstelle ihre Lizenz selbst angibt.

## 2. Laufzeitumgebung

### Umfang eines Voll-Scrapes

Der Scraper (`src/scripts/scrape-oparl/oparl-scraper.ts`) lädt neun Objektlisten seitenweise, mit
`SCRAPE_OPARL_FETCH_DELAY_MS` Pause nach jeder Seite. Die Live-API liefert 25 Objekte je Seite
(`pagination.elementsPerPage: 25`). Der Rohbestand vom 2026-10-24 hat 183.450 Objekte, also rund 7.300 Seiten. Bei
2 s Pause sind das allein gut 4 Stunden, dazu die Antwortzeiten. Ein inkrementeller Scrape (`modified_since`) dauert
Minuten.

### GitHub Actions

| Punkt                         | Wert                                                                                       | Quelle |
| ----------------------------- | ------------------------------------------------------------------------------------------ | ------ |
| Job-Laufzeit, GitHub-Runner   | bis 6 Stunden je Job                                                                       | [Limits][gh-limits] |
| Job-Laufzeit, eigener Runner  | bis 5 Tage je Job                                                                          | [Limits][gh-limits] |
| Workflow-Lauf                 | bis 35 Tage inkl. Warten                                                                   | [Limits][gh-limits] |
| Warteschlange                 | Abbruch nach 24 Stunden                                                                    | [Limits][gh-limits] |
| Gleichzeitige Jobs (Free)     | 20                                                                                         | [Limits][gh-limits] |
| Runner (Linux, öffentl. Repo) | 4 CPU, 16 GB RAM, 14 GB SSD                                                                | [Runner][gh-runners] |
| Kosten öffentliches Repo      | Standard-Runner kostenlos, eigene Runner kostenlos                                         | [Abrechnung][gh-billing] |
| Speicher (Free)               | Artefakte 500 MB, Cache 10 GB je Repo                                                       | [Limits][gh-limits] |
| Secrets                       | je 48 KB, bis 100 je Repo; für AWS geht OIDC statt dauerhafter Schlüssel                   | [Secrets][gh-secrets], [OIDC/AWS][gh-oidc] |

`schedule`-Trigger ([Events][gh-events]):

- kann bei hoher Last verzögert werden, besonders zur vollen Stunde; bei sehr hoher Last können Läufe entfallen.
  Empfehlung: eine krumme Minute wählen.
- läuft nur auf dem Standard-Branch; kürzester Abstand 5 Minuten.
- „In a public repository, scheduled workflows are automatically disabled when no repository activity has occurred
  in 60 days.“ Wieder einschalten geht über die Oberfläche oder die REST-API
  ([Workflows abschalten/einschalten][gh-disable]). Wenn der Scraper nur nach S3 schreibt und nichts committet,
  greift diese Abschaltung.

Die im Dezember 2025 angekündigte Gebühr von 0,002 $/Minute für eigene Runner wurde einen Tag später verschoben und
galt ohnehin nicht für öffentliche Repos
([Changelog](https://github.blog/changelog/2025-12-16-coming-soon-simpler-pricing-and-a-better-experience-for-github-actions/),
[Diskussion](https://github.com/orgs/community/discussions/182186)).

Ausgehende IPs der GitHub-Runner stammen aus geteilten Cloud-Bereichen ([Runner][gh-runners]); ob das
Ratsinformationssystem solche Adressen drosselt, ist nicht geprüft.

### Alternativen

- **Eigener Runner:** Job bis 5 Tage, kostenlos bei GitHub; Rechner und Betrieb muss jemand stellen.
- **AWS Lambda:** Laufzeit höchstens 15 Minuten
  ([Quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html)). Passt nur für den
  inkrementellen Scrape.
- **AWS ECS/Fargate mit EventBridge Scheduler:** Cron- oder Rate-Zeitplan startet einen Fargate-Task
  ([ECS-Doku](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/tasks-scheduled-eventbridge-scheduler.html)),
  kein Laufzeitlimit dort genannt. Abrechnung je Sekunde, mindestens 1 Minute; US East: ca. 0,040 $ je vCPU-Stunde
  und 0,0044 $ je GB-Stunde (x86), 20 GB flüchtiger Speicher inklusive
  ([Fargate-Preise](https://aws.amazon.com/fargate/pricing/)). Ein Voll-Scrape mit 0,25 vCPU und 0,5 GB über 5
  Stunden kostet damit wenige Cent. Die Docker-Images gibt es schon (`docker/`).

## 3. Veröffentlichungsorte

| Ort                 | Größenlimits                                                                 | Kosten                         | Zitierbar                         | Häufige Updates |
| ------------------- | ---------------------------------------------------------------------------- | ------------------------------ | --------------------------------- | --------------- |
| S3/CloudFront       | praktisch keine                                                              | AWS-Konto des Betreibers; CloudFront-Flatrate „Free“: 0 $, 1 Mio. Anfragen, 100 GB Transfer, 5 GB S3 ([Preise](https://aws.amazon.com/cloudfront/pricing/)) | nein (nur URL)                    | sehr gut; heute schon inkrementell (inhaltsadressierte Blobs + `manifest.json`, ADR-0005) |
| GitHub Releases     | Datei < 2 GiB, bis 1.000 Dateien je Release, Gesamtgröße und Bandbreite unbegrenzt ([Doku](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)) | kostenlos                      | nein (nur URL/Tag)                | gut; je Lauf ein Release oder ein fester Tag mit ersetzten Dateien |
| Zenodo              | 50 GB und höchstens 100 Dateien je Datensatz ([Dateien](https://help.zenodo.org/docs/deposit/manage-files/), [Policies](https://about.zenodo.org/policies/)); Aufteilen eines Datensatzes auf viele Einträge gilt nicht als faire Nutzung ([Quota](https://help.zenodo.org/docs/deposit/manage-quota/)) | kostenlos                      | ja: DOI je Version plus Concept-DOI für alle Versionen ([FAQ](https://support.zenodo.org/help/en-gb/1-upload-deposit/97-what-is-doi-versioning)) | mäßig; Dateien sind nach Veröffentlichung unveränderlich, jede Version ist ein neuer Datensatz ([Records](https://help.zenodo.org/docs/deposit/about-records/)) |
| GovData             | –                                                                            | –                              | –                                 | nicht möglich: „Daten privater oder anderer Einrichtungen werden auf GovData derzeit nicht zur Verfügung gestellt.“ ([FAQ](https://www.govdata.de/faq)) |
| Open Data Magdeburg | –                                                                            | –                              | –                                 | nicht möglich: Rubrik auf magdeburg.de, in der nur die Stadt veröffentlicht; OParl dort nicht aufgeführt |

Zenodo-API ([Developers](https://developers.zenodo.org/)): angemeldet 100 Anfragen/Minute, 5.000/Stunde; neue Version
per `POST /api/deposit/depositions/:id/actions/newversion` mit der ID der letzten Version; Sandbox unter
sandbox.zenodo.org. Datensätze bleiben für die Lebensdauer des Repositoriums erhalten (CERN).

### Bewertung

- Die rohen JSON-Daten (ca. 122 MB, neun Dateien) passen überall.
- Die PDFs (33.649 Dateien; Gesamtgröße unbekannt, OParl liefert in Magdeburg kein `size`) passen bei Zenodo und
  GitHub Releases nur gepackt (100 Dateien je Zenodo-Datensatz, 2 GiB je Release-Datei). Die Gesamtgröße muss vor
  einer Entscheidung gemessen werden.
- Täglich auf Zenodo ergäbe rund 365 Versionen mit eigener DOI im Jahr. Naheliegend ist eine Kombination:
  laufende Stände auf S3/CloudFront oder GitHub Releases, dazu in größerem Abstand (z. B. monatlich) eine zitierbare
  Zenodo-Version.

## Quellen

- Live-API: `https://ratsinfo.magdeburg.de/oparl/system`, `…/bodies/0001`, `…/bodies/0001/papers`,
  `…/bodies/0001/files/756331` (abgerufen 2026-11-16)
- [OParl-Spezifikation 1.1](https://oparl.org/spezifikation/online-ansicht/)
- [Datenlizenz Deutschland – Zero – 2.0](https://www.govdata.de/dl-de/zero-2-0)
- [Impressum magdeburg.de](https://www.magdeburg.de/Start/B%C3%BCrger-Stadt/System/Impressum-)
- [§ 5 UrhG](https://www.gesetze-im-internet.de/urhg/__5.html)
- GitHub: [Limits][gh-limits], [Events][gh-events], [Runner][gh-runners], [Abrechnung][gh-billing],
  [Secrets][gh-secrets], [OIDC/AWS][gh-oidc], [Workflows abschalten][gh-disable],
  [Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
- AWS: [Lambda-Quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html),
  [ECS + EventBridge Scheduler](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/tasks-scheduled-eventbridge-scheduler.html),
  [Fargate-Preise](https://aws.amazon.com/fargate/pricing/), [CloudFront-Preise](https://aws.amazon.com/cloudfront/pricing/)
- Zenodo: [Policies](https://about.zenodo.org/policies/), [Dateien](https://help.zenodo.org/docs/deposit/manage-files/),
  [Quota](https://help.zenodo.org/docs/deposit/manage-quota/), [Records](https://help.zenodo.org/docs/deposit/about-records/),
  [DOI-Versionierung](https://support.zenodo.org/help/en-gb/1-upload-deposit/97-what-is-doi-versioning),
  [Developers](https://developers.zenodo.org/)
- GovData: [FAQ](https://www.govdata.de/faq), [Datenbereitstellung](https://www.govdata.de/informationen/datenbereitstellung-govdata)

[gh-limits]: https://docs.github.com/en/actions/reference/limits
[gh-events]: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
[gh-runners]: https://docs.github.com/en/actions/reference/runners/github-hosted-runners
[gh-billing]: https://docs.github.com/en/billing/concepts/product-billing/github-actions
[gh-secrets]: https://docs.github.com/en/actions/reference/security/secrets
[gh-oidc]: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
[gh-disable]: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows
