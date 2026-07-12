import { z } from 'zod';

/**
 * Precompiled OParl derivatives consumed by the Astro build in place of the raw
 * OParl collections. The Zod schemas are the single source of truth; the
 * TypeScript types are derived from them via {@link z.infer} so schema and type
 * can never drift apart. No `schemaVersion`, no metadata envelope — the schema
 * validates itself.
 */

/**
 * Voting → paper map for a single parliament period.
 *
 * Keyed by ISO session date (`YYYY-MM-DD`), then by agenda item number
 * (`voting.votingSubject.agendaItem`). The value is the numeric paper id, i.e.
 * exactly what the former `getPaperId` join returned
 * (`+consultation.paper.split('/').pop()`).
 */
export const votingPaperMapSchema = z.record(
  z.string(),
  z.record(z.string(), z.number()),
);

export type VotingPaperMap = z.infer<typeof votingPaperMapSchema>;

/**
 * A single projected main paper in the global paper index.
 */
export const paperIndexEntrySchema = z.object({
  /** Full OParl id, e.g. `https://ratsinfo.magdeburg.de/oparl/bodies/0001/papers/12345`. */
  oparlId: z.string(),
  /** Numeric suffix of {@link oparlId} (`oparlId.split('/').pop()`). */
  id: z.string(),
  /** ISO date `YYYY-MM-DD`. */
  date: z.string(),
  paperType: z.string().optional(),
  reference: z.string().optional(),
  name: z.string(),
});

export type PaperIndexEntry = z.infer<typeof paperIndexEntrySchema>;

/**
 * The global paper index: all main papers (empty `subordinatedPaper`),
 * projected and stably sorted. No time filter — the 3-month window stays in the
 * Astro build.
 */
export const paperIndexSchema = z.array(paperIndexEntrySchema);

export type PaperIndex = z.infer<typeof paperIndexSchema>;
