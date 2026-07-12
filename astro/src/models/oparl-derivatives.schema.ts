import { z } from 'astro/zod';
import type {
  PaperIndex,
  PaperIndexEntry,
  VotingPaperMap,
} from './oparl-derivatives.ts';

// Runtime schemas for the committed OParl derivates, consumed by the Astro
// content collections to fail-fast-validate each derivate file.
// Uses astro/zod (= zod v4) so the schema object matches the instance Astro's
// content-collection validator expects.

export const votingPaperMapSchema = z.record(
  z.string(),
  z.record(z.string(), z.number()),
);

export const paperIndexEntrySchema = z.object({
  oparlId: z.string(),
  id: z.string(),
  date: z.string(),
  paperType: z.string().optional(),
  reference: z.string().optional(),
  name: z.string(),
});

export const paperIndexSchema = z.array(paperIndexEntrySchema);

// Compile-time drift guards: build fails if a schema and its canonical type diverge.
type AssertEqual<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : never
  : never;
export const _schemasMatchTypes: [
  AssertEqual<z.infer<typeof votingPaperMapSchema>, VotingPaperMap>,
  AssertEqual<z.infer<typeof paperIndexEntrySchema>, PaperIndexEntry>,
  AssertEqual<z.infer<typeof paperIndexSchema>, PaperIndex>,
] = [true, true, true];
