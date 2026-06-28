/**
 * Lightweight, precompiled views of OParl data consumed by the Astro build.
 *
 * These are produced offline by the `generate-oparl-assets` Deno script and
 * committed to `data/oparl-council/`, so the build reads small, council-scoped
 * JSON instead of parsing the full raw OParl snapshot. See
 * docs/handoffs/precompile-oparl.md and the ADR on precompiled OParl assets.
 */

/**
 * Metadata-only entry for a main (root) paper. The build keeps the rolling
 * "recent papers" date filter, so only the fields needed for that list and its
 * links are retained here — never the heavy consultation/file arrays.
 */
export type PaperIndexItem = {
  id: string;
  date: string;
  paperType?: string;
  reference?: string;
  name: string;
};
