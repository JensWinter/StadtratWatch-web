import * as path from '@std/path';
import { Registry } from '@srw-astro/models/registry';

export interface RegistryStore {
  loadRegistries(): Registry[];
}

export class RegistryFileStore implements RegistryStore {
  constructor(private readonly dataDir: string) {
  }

  public loadRegistries(): Registry[] {
    const registries: Registry[] = [];

    for (const entry of Deno.readDirSync(this.dataDir)) {
      if (!entry.isDirectory) {
        continue;
      }

      const registryPath = path.join(this.dataDir, entry.name, 'registry.json');
      if (!fileExists(registryPath)) {
        continue;
      }

      registries.push(JSON.parse(Deno.readTextFileSync(registryPath)) as Registry);
    }

    // Sorted by the canonical registry id for a deterministic processing order across runs.
    return registries.toSorted((a, b) => a.id.localeCompare(b.id));
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
