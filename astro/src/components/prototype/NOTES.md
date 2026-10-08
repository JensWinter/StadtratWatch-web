# Prototype: Badge "KI-Einschätzung" (issue #509)

## Verdict

**Variant C — icon only, next to the speaker name.** A small bot icon
(`lucide--bot`) right after `speech.speaker`, with a tooltip and a link to
`/methodik#ki-einschaetzung`. Kept in `Speech.astro`; variants A (inline
badge in the Fraktion/onBehalfOf row) and B (entry in the "…" menu) were
removed, along with the `?variant=` switcher.

Final wording, from the issue #509 comment:

> Dieser Redebeitrag enthält möglicherweise in Teilen KI-generierten Text.
> Informationen zur Analyse-Methodik.

Screenshot: see this branch at
http://localhost:4321/pp/magdeburg-8/session/2026-01-22?tab=speeches
(176 speeches, ~30 mock-flagged — dense enough to spot the icon without
hunting).

### Mobile follow-up: tap opened the methodology page directly

The icon was originally an `<a href="/methodik#...">` with a CSS
`tooltip`/`data-tip` (hover-driven). On touch devices there is no hover
state, so a tap fired the link's `click` immediately — the explanatory
text was never shown before navigating away. Fixed by reusing the same
disclosure pattern this file already uses for the "…" menu: the icon is
now a `<button>` inside a DaisyUI `dropdown` (tap/focus opens a panel with
the description and an explicit "Informationen zur Analyse-Methodik" link)
instead of being a link itself. No new touch-gesture JS — same
tap-to-open mechanic as the existing menu, so no extra interaction pattern
to learn.

## Still mock, not production-ready

`mockAiTextAssessment()` in `Speech.astro` is a deterministic hash flagging
~1 in 5 speeches — **not real data**, and not gated on a feature flag. The
real `aiTextAssessment` field (decided in #507, scripted in #508) isn't
wired into `SessionSpeech` yet. Once that lands, replace the mock with the
real field and add the `isFeatureEnabled()` + `highConfidenceNonHuman` gate
the card calls for — the markup/wording above is the design to carry over.

## Other open questions from #509, answered

- **False-positive rate in the badge text**: not needed. The validation
  gate (#506) came back at 0% High-Confidence AI/Mixed on the control
  corpus — the "≤ 2 %, publish as planned" branch, not the "2–10 %, name
  the rate" branch.
- **Badge in search results**: **no.** The `aiTextAssessment` field is
  explicitly out of scope for the Typesense index (card #501: "Suche: das
  neue Feld darf nicht in den Typesense-Index laufen"), and
  `_search.ts`/the Typesense schema don't carry it. No variant was built
  for `/search`.
- **Mobile**: variant C sits inline with the speaker name in the same
  `flex-wrap` row as the Fraktion/onBehalfOf badges, so it wraps the same
  way those already do.
