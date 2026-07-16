import * as path from '@std/path';
import { Registry } from '@srw-astro/models/registry';

export type SessionLocation = {
  parliamentPeriodId: string;
  sessionId: string;
};

// Maps a session date (YYYY-MM-DD) to the parliament period and session it
// belongs to. Session dates are unique across all periods, so the date is a
// safe key for resolving whether a consultation has a session page.
export type SessionIndex = { [sessionDate: string]: SessionLocation };

export interface SessionIndexStore {
  loadSessionIndex(): SessionIndex;
}

export class SessionIndexFileStore implements SessionIndexStore {
  constructor(private readonly dataDir: string) {
  }

  public loadSessionIndex(): SessionIndex {
    const sessionIndex: SessionIndex = {};

    for (const entry of Deno.readDirSync(this.dataDir)) {
      if (!entry.isDirectory) {
        continue;
      }

      const registry = this.readRegistry(path.join(this.dataDir, entry.name, 'registry.json'));
      if (!registry) {
        continue;
      }

      for (const session of registry.sessions) {
        sessionIndex[session.date] = {
          parliamentPeriodId: registry.id,
          sessionId: session.id,
        };
      }
    }

    return sessionIndex;
  }

  private readRegistry(filePath: string): Registry | null {
    try {
      return JSON.parse(Deno.readTextFileSync(filePath)) as Registry;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return null;
      }
      throw error;
    }
  }
}
