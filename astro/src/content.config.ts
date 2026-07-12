import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import type { Registry } from '@models/registry.ts';
import type { SessionScan } from '@models/session-scan.ts';
import type { SessionSpeech } from '@models/session-speech.ts';
import * as fs from 'node:fs';
import type { OparlPaper } from '@models/oparl.ts';
import { votingPaperMapSchema } from '@models/oparl-derivatives.schema.ts';
import { z } from 'astro/zod';

const parliamentPeriods = defineCollection({
  loader: glob({
    pattern: '**/registry.json',
    base: '../data',
    generateId: (options) => options.data.id as string,
  }),
  schema: z.custom<Registry>(),
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
  schema: z.custom<SessionScan>(),
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

const oparlPapers = defineCollection({
  loader: () =>
    JSON.parse(
      fs.readFileSync('../data/oparl-magdeburg/papers.json', 'utf8'),
    ) as OparlPaper[],
  schema: z.custom<OparlPaper>(),
});

export const collections = {
  parliamentPeriods,
  sessionScans,
  sessionSpeeches,
  votingPaperMaps,
  oparlPapers,
};
