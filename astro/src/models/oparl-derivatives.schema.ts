import { z } from 'astro/zod';
import type {
  PaperIndex,
  PaperIndexEntry,
  PaperReferenceMap,
} from './oparl-derivatives.ts';

// Runtime schemas for the committed OParl derivates, consumed by the Astro
// content collections to fail-fast-validate each derivate file.
// Uses astro/zod (= zod v4) so the schema object matches the instance Astro's
// content-collection validator expects.

export const paperIndexEntrySchema = z.object({
  oparlId: z.string(),
  id: z.string(),
  date: z.string(),
  paperType: z.string().optional(),
  reference: z.string().optional(),
  name: z.string(),
});

export const paperIndexSchema = z.array(paperIndexEntrySchema);

export const paperReferenceMapSchema = z.record(z.string(), z.number());

// Compile-time drift guards: build fails if a schema and its canonical type diverge.
type AssertEqual<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : never
  : never;
export const _schemasMatchTypes: [
  AssertEqual<z.infer<typeof paperIndexEntrySchema>, PaperIndexEntry>,
  AssertEqual<z.infer<typeof paperIndexSchema>, PaperIndex>,
  AssertEqual<z.infer<typeof paperReferenceMapSchema>, PaperReferenceMap>,
] = [true, true, true];
