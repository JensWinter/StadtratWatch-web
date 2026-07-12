import * as path from '@std/path';
import { Registry } from '@srw-astro/models/registry';
import { PeriodRegistry } from './model.ts';

export interface RegistryStore {
  loadRegistries(): PeriodRegistry[];
}

/**
 * Discovers parliament period registries by scanning the data directory for
 * `{period-id}/registry.json`. Returns them sorted by period id for a
 * deterministic processing order.
 */
export class RegistryFileStore implements RegistryStore {
  constructor(private readonly dataDir: string) {
  }

  public loadRegistries(): PeriodRegistry[] {
    const registries: PeriodRegistry[] = [];

    for (const entry of Deno.readDirSync(this.dataDir)) {
      if (!entry.isDirectory) {
        continue;
      }

      const registryPath = path.join(this.dataDir, entry.name, 'registry.json');
      if (!fileExists(registryPath)) {
        continue;
      }

      const registry = JSON.parse(Deno.readTextFileSync(registryPath)) as Registry;
      registries.push({ periodId: entry.name, registry });
    }

    return registries.toSorted((a, b) => a.periodId.localeCompare(b.periodId));
  }
}

function fileExists(filePath: string): boolean {
  try {
    return Deno.statSync(filePath).isFile;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
}
