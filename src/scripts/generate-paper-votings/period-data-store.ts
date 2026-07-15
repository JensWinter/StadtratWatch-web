import * as path from '@std/path';
import { Registry } from '@srw-astro/models/registry';
import { SessionScan } from '@srw-astro/models/session-scan';
import { VotingPaperMap } from '@srw-astro/models/oparl-derivatives';

export type PeriodData = {
  registry: Registry;
  votingPaperMap: VotingPaperMap;
  sessionScansByDate: { [sessionDate: string]: SessionScan };
};

export interface PeriodDataStore {
  loadPeriods(): PeriodData[];
}

export class PeriodDataFileStore implements PeriodDataStore {
  constructor(private readonly dataDir: string) {
  }

  public loadPeriods(): PeriodData[] {
    const periods: PeriodData[] = [];

    for (const entry of Deno.readDirSync(this.dataDir)) {
      if (!entry.isDirectory) {
        continue;
      }

      const periodDir = path.join(this.dataDir, entry.name);
      const registry = this.readJsonFile<Registry>(path.join(periodDir, 'registry.json'));
      if (!registry) {
        continue;
      }

      periods.push({
        registry,
        votingPaperMap: this.readJsonFile<VotingPaperMap>(path.join(periodDir, 'voting-paper-map.json')) ?? {},
        sessionScansByDate: this.loadSessionScansByDate(periodDir, registry),
      });
    }

    // Sorted by the canonical registry id for a deterministic processing order across runs.
    return periods.toSorted((a, b) => a.registry.id.localeCompare(b.registry.id));
  }

  private loadSessionScansByDate(periodDir: string, registry: Registry): { [sessionDate: string]: SessionScan } {
    const sessionScansByDate: { [sessionDate: string]: SessionScan } = {};

    for (const session of registry.sessions) {
      const sessionScanPath = path.join(periodDir, session.date, `session-scan-${session.date}.json`);
      const sessionScan = this.readJsonFile<SessionScan>(sessionScanPath);
      if (sessionScan) {
        sessionScansByDate[session.date] = sessionScan;
      }
    }

    return sessionScansByDate;
  }

  private readJsonFile<T>(filePath: string): T | null {
    try {
      return JSON.parse(Deno.readTextFileSync(filePath)) as T;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return null;
      }
      throw error;
    }
  }
}
