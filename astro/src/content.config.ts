import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import type { Registry } from '@models/registry.ts';
import type { SessionScan } from '@models/session-scan.ts';
import type { SessionSpeech } from '@models/session-speech.ts';
import * as fs from 'node:fs';
import type {
  OparlAgendaItem,
  OparlConsultation,
  OparlMeeting,
} from '@models/oparl.ts';
import type { PaperIndexItem } from '@models/oparl-prepared.ts';
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

// OParl collections below are loaded from the precompiled, council-scoped slice
// in data/oparl-council/ (produced offline by the generate-oparl-assets Deno
// script), not from the full raw OParl snapshot. See docs/handoffs/precompile-oparl.md.

const oparlMeetings = defineCollection({
  loader: () =>
    JSON.parse(
      fs.readFileSync('../data/oparl-council/meetings.json', 'utf8'),
    ) as OparlMeeting[],
  schema: z.custom<OparlMeeting>(),
});

const oparlAgendaItems = defineCollection({
  loader: () =>
    JSON.parse(
      fs.readFileSync('../data/oparl-council/agenda-items.json', 'utf8'),
    ) as OparlAgendaItem[],
  schema: z.custom<OparlAgendaItem>(),
});

const oparlConsultations = defineCollection({
  loader: () =>
    JSON.parse(
      fs.readFileSync('../data/oparl-council/consultations.json', 'utf8'),
    ) as OparlConsultation[],
  schema: z.custom<OparlConsultation>(),
});

const papersIndex = defineCollection({
  loader: () =>
    JSON.parse(
      fs.readFileSync('../data/oparl-council/papers-index.json', 'utf8'),
    ) as PaperIndexItem[],
  schema: z.custom<PaperIndexItem>(),
});

export const collections = {
  parliamentPeriods,
  sessionScans,
  sessionSpeeches,
  oparlMeetings,
  oparlAgendaItems,
  oparlConsultations,
  papersIndex,
};
