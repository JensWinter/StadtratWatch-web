import { readdir } from 'node:fs/promises';
import * as path from 'node:path';

import type { VotingPaperMap } from '@srw-astro/models/oparl-derivatives';
import type { Registry } from '@srw-astro/models/registry';
import { assertValidSessionScan, type SessionScan } from '@srw-astro/models/session-scan';

export type PeriodData = {
  registry: Registry;
  votingPaperMap: VotingPaperMap;
  sessionScansByDate: { [sessionDate: string]: SessionScan };
};

export interface PeriodDataStore {
  loadPeriods(): Promise<PeriodData[]>;
}

export class PeriodDataFileStore implements PeriodDataStore {
  constructor(private readonly dataDir: string) {}

  public async loadPeriods(): Promise<PeriodData[]> {
    const periods: PeriodData[] = [];

    for (const entry of await readdir(this.dataDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }

      const periodDir = path.join(this.dataDir, entry.name);
      const registry = await this.readJsonFile<Registry>(path.join(periodDir, 'registry.json'));
      if (!registry) {
        continue;
      }

      periods.push({
        registry,
        votingPaperMap: (await this.readJsonFile<VotingPaperMap>(path.join(periodDir, 'voting-paper-map.json'))) ?? {},
        sessionScansByDate: await this.loadSessionScansByDate(periodDir, registry),
      });
    }

    // Sorted by the canonical registry id for a deterministic processing order across runs.
    return periods.toSorted((a, b) => a.registry.id.localeCompare(b.registry.id));
  }

  private async loadSessionScansByDate(
    periodDir: string,
    registry: Registry,
  ): Promise<{ [sessionDate: string]: SessionScan }> {
    const sessionScansByDate: { [sessionDate: string]: SessionScan } = {};

    for (const session of registry.sessions) {
      const sessionScanPath = path.join(periodDir, session.date, `session-scan-${session.date}.json`);
      const sessionScan = await this.readJsonFile<SessionScan>(sessionScanPath);
      if (sessionScan) {
        assertValidSessionScan(sessionScan, sessionScanPath);
        sessionScansByDate[session.date] = sessionScan;
      }
    }

    return sessionScansByDate;
  }

  private async readJsonFile<T>(filePath: string): Promise<T | null> {
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      return null;
    }
    return (await file.json()) as T;
  }
}
