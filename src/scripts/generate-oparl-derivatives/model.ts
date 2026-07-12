import { Registry } from '@srw-astro/models/registry';

/**
 * A parliament period registry paired with its period id (the `data/`
 * subdirectory name, e.g. `magdeburg-8`). Produced by the {@link RegistryStore}
 * when scanning `data/` for `{period-id}/registry.json`.
 */
export type PeriodRegistry = {
  periodId: string;
  registry: Registry;
};
