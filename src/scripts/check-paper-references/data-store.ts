import { readdir } from 'node:fs/promises';
import * as path from 'node:path';

import type { PaperReferenceMap } from '@srw-astro/models/oparl-derivatives';
import type { SessionScan } from '@srw-astro/models/session-scan';

export type SessionScansByDate = { [sessionDate: string]: SessionScan };

export interface CheckInputStore {
  loadPaperReferenceMap(): Promise<PaperReferenceMap>;
  loadSessionScansByDate(): Promise<SessionScansByDate>;
}

export class CheckInputFileStore implements CheckInputStore {
  constructor(private readonly dataDir: string) {}

  public async loadPaperReferenceMap(): Promise<PaperReferenceMap> {
    return (await Bun.file(path.join(this.dataDir, 'paper-reference-map.json')).json()) as PaperReferenceMap;
  }

  public async loadSessionScansByDate(): Promise<SessionScansByDate> {
    const sessionScansByDate: SessionScansByDate = {};

    for (const sessionDir of await this.listSessionDirs()) {
      const sessionDate = path.basename(sessionDir);
      const sessionScanFile = Bun.file(path.join(sessionDir, `session-scan-${sessionDate}.json`));
      if (await sessionScanFile.exists()) {
        sessionScansByDate[sessionDate] = (await sessionScanFile.json()) as SessionScan;
      }
    }

    return sessionScansByDate;
  }

  private async listSessionDirs(): Promise<string[]> {
    const sessionDirs: string[] = [];

    for (const periodEntry of await readdir(this.dataDir, { withFileTypes: true })) {
      if (!periodEntry.isDirectory()) {
        continue;
      }
      const periodDir = path.join(this.dataDir, periodEntry.name);
      for (const sessionEntry of await readdir(periodDir, { withFileTypes: true })) {
        if (sessionEntry.isDirectory()) {
          sessionDirs.push(path.join(periodDir, sessionEntry.name));
        }
      }
    }

    return sessionDirs.toSorted((a, b) => path.basename(a).localeCompare(path.basename(b)));
  }
}
