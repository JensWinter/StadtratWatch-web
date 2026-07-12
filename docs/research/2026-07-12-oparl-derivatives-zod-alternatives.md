# Zod im geteilten Modell `oparl-derivatives.ts`: Alternativen & Konsequenzen

Datum: 2026-07-12
Frage: Muss `astro/src/models/oparl-derivatives.ts` Zod importieren, obwohl der Nutzer das
Teilen einer Zod-Abhängigkeit über die Astro- (npm) **und** Deno-Runtime hinweg ablehnt?
Welche Alternativen gibt es (mit Trade-offs), und was passiert, wenn Zod dort ganz entfällt?

Kontext: Der Deno-Generator (`src/scripts/generate-oparl-derivatives/*.ts`) importiert aus dem
Modell **nur die Typen** (`VotingPaperMap`, `PaperIndex`, `PaperIndexEntry`,
`oparl-derivatives-generator.ts:12`, `derivatives-writer.ts:2`). Die Zod-Schema-Objekte
führt er nie aus. Weil der Deno-Reexport aber `export *` ist
(`src/deps/astro/oparl-derivatives.ts:1`), muss `deno check` das Modell samt seinem
`import { z } from 'zod'` (`oparl-derivatives.ts:1`) auflösen — deshalb steht `"zod":
"npm:zod@^4.3.6"` in der Root-`deno.json` (Zeile 17). Genau diese rein zum Typcheck
gezogene npm-Abhängigkeit stört.

## Empfehlung (Kurzfassung)

**Typen von Schema trennen** (Option 1). Die kanonischen TS-Typen in eine importfreie
`oparl-derivatives.ts` legen (nur `export type …`), die realen Zod-Schemata in eine
**Astro-only** Datei (`oparl-derivatives.schema.ts`), die die Typen importiert und via
`satisfies` an sie bindet. Nur die reine Typdatei wird nach Deno reexportiert. Dann muss
`deno check` nie mehr Zod auflösen, `"zod"` verschwindet aus der Deno-`deno.json`, **und**
der Fail-fast-Schutz aus Spec §5.1 bleibt vollständig erhalten (Astro validiert weiterhin
jede committete Derivat-Datei gegen das echte Schema). Das ist die einzige Option, die die
Bedenken des Nutzers (kein geteiltes Zod) **und** das Zielkriterium der Spec gleichzeitig
erfüllt. Alle anderen Optionen opfern entweder den Validierungsschutz oder teilen Zod
weiterhin.

Wichtige Randbedingung, die die Spec-Annahme korrigiert: Dieses Repo läuft auf **Astro
7.0.5** (`astro/node_modules/astro/package.json` → `"version": "7.0.5"`), nicht Astro 5.
Für Content-Collection-Schemata ändert das nichts Wesentliches — Astro 7 validiert weiterhin
**Zod-only** (Beleg unten).

---

## Primärquellen-Befund: Astro akzeptiert nur Zod (kein Standard Schema, keine throw-Funktion)

Direkt aus dem installierten Astro-Runtime-Code (`astro/node_modules/astro/dist/`, v7.0.5):

- Die Validierung ruft eine **Zod-spezifische** API auf:
  `const parsed = await schema.safeParseAsync(data, { error(issue) { … } })`
  (`content/utils.js:143`). Das ist nicht das Standard-Schema-Interface
  (`~standard.validate`) und keine „Funktion, die wirft".
- Der `typeof schema === "function"`-Zweig (`content/utils.js:117`) ist **nicht** eine
  freie Validierungsfunktion, sondern die dokumentierte `(context) => zodSchema`-Form: das
  Ergebnis der Funktion bekommt anschließend selbst `.safeParseAsync` aufgerufen
  (`content/utils.js:123, 141–143`). Eine throw-basierte Validierung ist damit **nicht**
  vorgesehen.
- Für Live-Collections prüft Astro das Schema-Objekt explizit auf einen Zod-internen Marker:
  `schema: z.custom((v) => "_zod" in v)` (`content/utils.js:82`) — d. h. dort wird sogar
  strukturell „ist ein Zod-v4-Schema" erzwungen.
- Im gesamten `dist/`-Baum gibt es **null** Treffer für `~standard` / `StandardSchemaV1` /
  Standard-Schema-Handling (grep über `astro/node_modules/astro/dist/`). Astro 7 kennt
  Standard Schema für Content-Collections nicht.

Die offizielle Doku bestätigt das auf Konzeptebene: „Astro uses Zod to power its content
schemas … every … data property … must be defined using a Zod data type" und „import the
`z` utility from `astro/zod`"
([Astro Docs — Content collections](https://docs.astro.build/en/guides/content-collections/)).
Die API-Referenz beschreibt `schema` als „optional Zod object or function that returns a Zod
object … Each value must use a Zod validator"
([Astro Docs — astro:content reference](https://docs.astro.build/en/reference/modules/astro-content/)).

**Folgerung:** Sobald der Astro-Build eine Derivat-Datei *validieren* soll (Spec §5.1), muss
im Astro-Prozess ein **Zod**-Schema stehen. Nicht-Zod-Validatoren (Valibot/ArkType/TypeBox
via Standard Schema) sind in Astro 7 keine Option — ihre Betrachtung erübrigt sich für die
Content-Collection-Validierung.

Das Zod, das Astro nutzt, ist ohnehin Zod v4: `astro/node_modules/astro/dist/zod.js`
reexportiert `zod/v4` (`export * from "zod/v4"`), und `astro/package.json` deklariert
`zod ^4.3.6` — dieselbe Major wie Deno via `npm:zod@^4.3.6` (`deno.json:17`).

## Primärquellen-Befund: Deno hat mit `npm:zod` kein *technisches* Problem

`npm:`-Specifier sind in Deno erstklassig: „To use a package from npm, import it with an
`npm:` prefix and run the file"; „Deno downloads the package on first run and stores it in a
global cache, so your project directory stays clean"
([Deno Docs — Node & npm](https://docs.deno.com/runtime/fundamentals/node/)). Es gibt hier
keinen Laufzeit-Interop-Blocker. Der Einwand des Nutzers ist damit **architektonisch/
ästhetisch** (Deno zieht npm:zod nur, um ein Modul zu *typechecken*, dessen Laufzeit-Schema
es nie ausführt), nicht ein Funktionsdefekt.

Zod ist zudem **nativ auf JSR** verfügbar — offiziell als `@zod/zod` (Scope gehört
colinhacks; `runtimeCompat.deno: true`; latest `4.4.3`; JSR-API
`https://api.jsr.io/scopes/zod/packages/zod`), siehe auch
[jsr.io/@zod/zod](https://jsr.io/@zod/zod). Ein Deno-nativer Specifier `jsr:@zod/zod` wäre
also möglich (Option 3), löst aber das Kernproblem nicht (s. u.: erzeugt eine **zweite**
Zod-Instanz und lässt das rein-zum-Typcheck-Ziehen bestehen).

---

## Optionen im Detail

### Option 1 — Typen von Schema trennen (empfohlen)

**Mechanismus.** Zwei Dateien statt einer:

- `astro/src/models/oparl-derivatives.ts` — **nur** `export type VotingPaperMap`,
  `PaperIndexEntry`, `PaperIndex`. Keine Imports. Diese Datei wird via
  `src/deps/astro/oparl-derivatives.ts` (`export *`) nach Deno reexportiert.
- `astro/src/models/oparl-derivatives.schema.ts` (Astro-only, **nicht** in
  `src/deps/astro/deno.json` gelistet) — `import { z } from 'astro/zod'` + die realen
  `z.object`/`z.record`-Schemata; Bindung an die Typen z. B. mit
  `export const paperIndexSchema = z.object({…}) satisfies z.ZodType<PaperIndex>` bzw. ein
  Test/`z.infer`-Vergleich, damit Typ und Schema nicht driften.
- `astro/src/content.config.ts` importiert die Schemata aus `oparl-derivatives.schema.ts`.

**Warum das das Deno-Zod-Ziehen beseitigt.** `export *` reexportiert nur, was das Zielmodul
selbst importiert/exportiert. Wenn die reexportierte Datei importfrei ist, hat `deno check`
nichts von `zod` mehr aufzulösen — `"zod"` kann aus `deno.json` (Zeile 17) entfernt werden.
Aktuell ist `oparl-derivatives.ts` die **einzige** Modelldatei, die Zod importiert (grep über
`astro/src/models/` und `src/deps/astro/`), d. h. nach der Trennung braucht die gesamte
Deno-Seite kein Zod mehr.

**Warum Astro weiter validiert.** `defineCollection({ schema })` akzeptiert jedes
importierte Zod-Schema-Objekt; es muss nicht inline stehen — die Doku zeigt `schema` als
freien Zod-Ausdruck, und der Runtime ruft schlicht `schema.safeParseAsync` darauf auf
(`content/utils.js:143`). Ein aus einem Nachbarmodul importiertes Schema funktioniert
identisch.

**Trade-offs.**
- (+) Erfüllt Nutzer-Bedenken **und** Spec §5.1 vollständig; keine Schutzlücke.
- (+) Minimale Änderung an der Spec: nur „ein Modell-*File*" → „ein Typ-File + ein
  Schema-File". Die Substanz aus §3/§5 („echte Zod-Schemata", „Typ via `z.infer` ableiten")
  bleibt.
- (−) Zwei Dateien statt einer; Typ↔Schema-Synchronität muss aktiv gehalten werden
  (`satisfies z.ZodType<T>` oder ein `expectTypeOf`-Test fängt Drift). Das ist ein kleiner,
  lokaler Preis — genau das, wofür `z.infer` in der jetzigen Ein-Datei-Lösung sorgt, nur nun
  über die Datei-Grenze.

### Option 2 — Alles bleibt in einer Datei, aber Deno bekommt Zod via JSR statt npm

**Mechanismus.** `deno.json` mappt `"zod": "jsr:@zod/zod@^4"` statt `npm:zod@^4.3.6`; das
Modell bleibt unverändert eine Datei.

**Trade-offs.**
- (−) Löst das Kernproblem **nicht**: Deno zieht weiterhin Zod nur zum Typchecken eines
  Schemas, das es nie ausführt — der eigentliche Einwand.
- (−) **Zwei getrennte Zod-Instanzen** (Astros `npm:zod`/`zod/v4` vs. Denos `jsr:@zod/zod`).
  Solange die Deno-Seite die Schema-Objekte nur *typt* und nie an Astro *übergibt*, ist
  Instanz-Identität egal — aber Astros Live-Collection-Pfad prüft real `"_zod" in v`
  (`content/utils.js:82`) und der Data-Pfad ruft `.safeParseAsync` (Zeile 143); jede
  Vermischung zweier Instanzen wäre fragil. Kein Gewinn gegenüber Status quo.

### Option 3 — Nicht-Zod-Validator (Valibot/ArkType/TypeBox) via Standard Schema

**Mechanismus.** Ersatz von Zod durch einen leichteren Standard-Schema-Validator.

**Trade-offs.**
- (−) **In Astro 7 unmöglich** für Content-Collections: Der Runtime spricht Zod
  (`.safeParseAsync`, `"_zod" in v`), nicht das Standard-Schema-`~standard.validate`
  (Befund oben; kein `~standard` im `dist/`). Ein Standard-Schema-Objekt würde die
  Collection-Validierung nicht durchlaufen.
- (−) Selbst wenn es ginge: Das Teilen-Problem wäre **identisch** — ein geteilter Validator
  über npm+Deno — außer man trennt ohnehin Typen von Schema (dann ist man bei Option 1 und
  die Validator-Wahl wird zur reinen Astro-internen Geschmacksfrage). Kein eigenständiger
  Vorteil.

### Option 4 — Zod ganz fallenlassen (nur TS-Typen, keine Laufzeit-Schemata irgendwo)

**Mechanismus.** `oparl-derivatives.ts` wird zu reinen `export type`-Deklarationen (wie im
Spec-§3-Codeblock, der bereits nur Typen zeigt); `content.config.ts` fällt für die zwei
Derivat-Collections auf `z.custom<VotingPaperMap>()` / `z.custom<PaperIndex>()` zurück — den
**heutigen Zustand** der Roh-Collections (`content.config.ts:21, 33, 53–77`).

**Konsequenzen** — siehe eigener Abschnitt unten. Kurz: verletzt Spec §5.1.

---

## Konsequenzen des Zod-Wegfalls (gebunden an die Spec-Schutzversprechen)

Die Spec begründet Zod an genau einer Stelle: **§5 Punkt 1 „Schema-Drift → echte
Zod-Schemata"** (Zeilen 96) — plus §3 „Modell-Ort & Zod-Schemata (#434)" (Zeile 74). Das
Versprechen: Der Astro-Build validiert die **Form jeder committeten Derivat-Datei** gegen das
echte Schema und **bricht bei Abweichung ab** — deckt strukturell zwei Fälle ab:
(a) „Schema ↔ Code laufen auseinander" und (b) „altes committetes Derivat trifft neuen Code".
Weil CI/Netlify **keine** Roh-OParl-Daten haben (§5-Grundhaltung, Zeile 94; §2 Zeile 36),
ist „im CI neu generieren und diffen" ausgeschlossen — der **einzige** aktive Schutz gegen
Schema-Drift auf committeten Dateien ist diese Zod-Validierung.

Fällt Zod ersatzlos weg (Option 4):

1. **§5.1 ist verletzt.** `z.custom<T>()` führt **keine** Laufzeitprüfung durch (die Spec
   sagt das selbst über den Ist-Zustand: „alle mit `z.custom<T>()` → **null**
   Laufzeitschutz", §2 Zeile 24). Ein umbenanntes Feld / geänderte Struktur / ein altes
   committetes Derivat gegen neuen Code würde **stillschweigend** durchlaufen und potenziell
   erst als kaputte Seite oder falscher Link sichtbar. Genau der Fail-fast entfällt.
2. **Der cross-file-Check (§5.2/§5.4) bleibt unberührt.** Er lebt in einem separaten
   Build-Hook-Modul (`astro:config:setup`/`astro:build:start`) und braucht kein Zod — nur die
   Per-Datei-Formprüfung geht verloren.
3. **PR-Zuschnitt der Spec (§9) bricht teilweise:** PR A und PR B fordern jeweils explizit
   „Derivat-Collection … (Zod)" (Zeilen 149–150). Ohne Zod müssten beide PRs von „echtes
   `z.object`/`z.record`-Schema" auf „`z.custom<T>()` = keine Validierung" heruntergestuft
   werden; die Foundation-PR 0 (Zeile 148, „Modelle + Zod-Schemata") verlöre die Schemata.
   Der Generator (PR 0) und die Seitenmigration (PR A/B `getPaperId`→Lookup, `paper-index`)
   funktionieren **weiterhin** — sie nutzen nur die Typen; es bricht **nur** der
   Validierungsschutz.

**Teil-Rückgewinn ohne geteiltes Zod (falls Option 4 dennoch gewünscht):** hand-geschriebene
Type-Guards / Assertion-Funktionen in reinem TS (`function assertPaperIndex(v: unknown):
asserts v is PaperIndex`). Laufen nativ in beiden Runtimes, **null** geteilte Abhängigkeit,
und Astros `schema`-Funktionsform könnte theoretisch — nein: Astro ruft auf dem
Funktionsergebnis wieder `.safeParseAsync` (`content/utils.js:143`), ein throwender Guard
lässt sich also **nicht** direkt als Collection-`schema` verdrahten; er müsste in
`z.custom<T>((v) => { assert…; return true })` gewickelt werden (dann validiert Zod-`custom`
zur Laufzeit über den Guard) **oder** in den separaten Build-Hook (§5.4) wandern. Beides
kostet handgepflegte Redundanz — exakt die „manuell gepflegte Version"/Drift, die §3
(„selbstprüfendes Schema statt manuell gepflegter Version", Zeile 74) und `z.infer`
vermeiden wollten. Der Schutz wäre so nur so gut wie die Guard-Disziplin.

---

## Fazit: welche Option die Bedenken am besten trifft

**Option 1 (Typen-File von Astro-only-Schema-File trennen)** ist die einzige, die

- das konkrete Ärgernis beseitigt — Deno löst nach der Trennung **kein** `zod` mehr auf,
  `"zod"` verschwindet aus `deno.json` (die Deno-Seite nutzt ohnehin nur Typen,
  `oparl-derivatives-generator.ts:12`, `derivatives-writer.ts:2`), **und**
- Spec §5.1 **unverändert** erfüllt — Astro validiert weiter mit echtem Zod v4
  (`astro/zod` = `zod/v4`) gegen jede committete Derivat-Datei.

Zu **relaxen wäre in der Spec nur** die Formulierung „**ein** kanonisches File
`oparl-derivatives.ts` mit **beiden** Typen **und** den Zod-Schemata" (§3 Zeile 74): daraus
wird „ein importfreies Typ-File (nach Deno reexportiert) + ein Astro-only Schema-File". Die
inhaltlichen Zusagen — echte `z.object`/`z.record`, keine `schemaVersion`, keine
Metadaten-Hülle, Typ↔Schema synchron via `satisfies`/`z.infer` — bleiben bestehen.

Würde Zod **ganz** fallen (Option 4), müsste die Spec §5 Punkt 1 **streichen oder
abschwächen** (von „echte Zod-Schemata, Build bricht bei Formabweichung ab" auf „keine
Per-Datei-Formvalidierung" bzw. „handgeschriebene Guards ohne z.infer-Kopplung"), und §9 die
„(Zod)"-Zusätze in PR 0/A/B entfernen. Das gibt genau den Fail-fast-Schutz auf committeten
Derivaten preis, für den Zod dort überhaupt steht — nicht empfohlen.
