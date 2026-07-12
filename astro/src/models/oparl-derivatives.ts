import { z } from 'zod';

// Schemas are the source of truth; types are inferred so the two cannot drift.
// Deliberately no schemaVersion / metadata envelope — the schema self-validates.

// sessionDate -> agendaItemNumber -> numeric paper id (the value the former getPaperId join produced).
export const votingPaperMapSchema = z.record(
  z.string(),
  z.record(z.string(), z.number()),
);

export type VotingPaperMap = z.infer<typeof votingPaperMapSchema>;

export const paperIndexEntrySchema = z.object({
  oparlId: z.string(),
  id: z.string(), // numeric suffix of oparlId
  date: z.string(),
  paperType: z.string().optional(),
  reference: z.string().optional(),
  name: z.string(),
});

export type PaperIndexEntry = z.infer<typeof paperIndexEntrySchema>;

// Carries all main papers; the 3-month time filter stays in the Astro build.
export const paperIndexSchema = z.array(paperIndexEntrySchema);

export type PaperIndex = z.infer<typeof paperIndexSchema>;
