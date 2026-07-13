import { Registry } from '@srw-astro/models/registry';

export type PeriodRegistry = {
  periodId: string; // the data/ subdirectory name, e.g. magdeburg-8
  registry: Registry;
};
