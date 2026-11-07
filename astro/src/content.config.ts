import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { findSeatCountMismatch, type Registry } from '@models/registry.ts';
import type { SessionSpeech } from '@models/session-speech.ts';
import * as fs from 'node:fs';
import type { PaperIndex } from '@models/oparl-derivatives.ts';
import {
  paperIndexEntrySchema,
  votingPaperMapSchema,
} from '@models/oparl-derivatives.schema.ts';
import { sessionScanSchema } from '@models/session-scan.schema.ts';
import { z } from 'astro/zod';

const parliamentPeriods = defineCollection({
  loader: glob({
    pattern: '**/registry.json',
    base: '../data',
    generateId: (options) => options.data.id as string,
  }),
  // Majorities of members are measured against the faction seats, so a wrong
  // seat count must fail the build instead of skewing results.
  schema: z.custom<Registry>().superRefine((registry, context) => {
    const mismatch = findSeatCountMismatch(registry);
    if (mismatch) {
      context.addIssue({
        code: 'custom',
        message: `registry.json: ${mismatch}`,
      });
    }
  }),
});

const sessionScans = defineCollection({
  loader: glob({
    pattern: '**/session-scan-*.json',
    base: '../data',
    generateId: (options) => {
      const entryParts = options.entry.split('/');
      return `${entryParts[0]}/${entryParts[1]}`;
    },
  }),
  schema: sessionScanSchema,
});

const sessionSpeeches = defineCollection({
  loader: glob({
    pattern: '**/session-speeches-*.json',
    base: '../data',
    generateId: (options) => {
      const entryParts = options.entry.split('/');
      return `${entryParts[0]}/${entryParts[1]}`;
    },
  }),
  schema: z.array(z.custom<SessionSpeech>()),
});

const votingPaperMaps = defineCollection({
  loader: glob({
    pattern: '**/voting-paper-map.json',
    base: '../data',
    generateId: (options) => options.entry.split('/')[0],
  }),
  schema: votingPaperMapSchema,
});

const paperIndex = defineCollection({
  loader: () =>
    JSON.parse(
      fs.readFileSync('../data/paper-index.json', 'utf8'),
    ) as PaperIndex,
  schema: paperIndexEntrySchema,
});

export const collections = {
  parliamentPeriods,
  sessionScans,
  sessionSpeeches,
  votingPaperMaps,
  paperIndex,
};
