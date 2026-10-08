# Prototype: Badge "KI-Einschätzung" (issue #509)

Three placements of the KI-Einschätzung badge in `Speech.astro`, switchable via `?variant=A|B|C` on any session/person page with speeches, e.g.:

- http://localhost:4321/pp/magdeburg-8/session/2026-01-22?tab=speeches
- http://localhost:4321/pp/magdeburg-8/person/<personId>?tab=speeches

Flip variants with the floating bottom bar (dev-only) or by editing `?variant=` directly. `2026-01-22` has 176 speeches and ~30 mocked as flagged, so it's dense enough to actually see the badge without hunting.

## Variants

- **A — Badge in the existing row**, next to Fraktion/onBehalfOf: `badge-warning badge-soft`, text "KI-Einschätzung", tooltip with the neutral wording, links to `/methodik#ki-einschaetzung`.
- **B — Tucked into the "…" menu**: an extra menu item below "Link kopieren" / "Beitrag melden", same text and link. Invisible until the menu is opened.
- **C — Icon only**, next to the speaker name: a small bot icon with a tooltip, link to the methodology page. Smallest footprint.

Mock data: `mockAiTextAssessment()` in `Speech.astro` is a deterministic hash flagging ~1 in 5 speeches — **not real data**. The real `aiTextAssessment` field (decided in #507, scripted in #508) isn't wired into `SessionSpeech` yet. Delete the mock function along with everything else below once a variant is picked.

## Answering the open questions from #509

- **False-positive rate in the badge text**: not needed. The validation gate (#506) came back at 0% High-Confidence AI/Mixed on the control corpus — that's the "≤ 2 %, publish as planned" branch, not the "2–10 %, name the rate" branch. None of the variants mention a rate.
- **Badge in search results**: **no.** The `aiTextAssessment` field is explicitly out of scope for the Typesense index (card #501, "Suche: das neue Feld darf nicht in den Typesense-Index laufen"), and `_search.ts`/the Typesense schema don't carry it. Showing the badge there would require indexing data that was deliberately excluded. No variant was built for `/search`.
- **Feature flag gating**: not wired into the prototype — this is a visual/placement question, so the mock bypasses `isFeatureEnabled()` on purpose. The real implementation must gate on the flag plus `highConfidenceNonHuman` the way the mock gates on hash-flagged speeches.
- **Mobile**: all three variants reuse the existing `flex-wrap` badge row / dropdown menu, so they wrap the same way the Fraktion/onBehalfOf badges already do. Check narrow viewports before picking a winner.

## Verdict

_Not yet decided — fill in once reviewed: chosen variant, final wording, screenshot link._
