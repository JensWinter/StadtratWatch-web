import * as path from 'node:path';

import type { Registry } from '@srw-astro/models/registry';
import type { SessionInput } from '@srw-astro/models/session-input';
import { assertKnownVoteCodes, type SessionScan } from '@srw-astro/models/session-scan';
import type { SessionSpeech } from '@srw-astro/models/session-speech';

export type InputData = {
  registry: Registry;
  sessionsInput: SessionInput[];
};

export class InputDataLoaders {
  constructor(private readonly inputDir: string) {}

  public async loadInputData(): Promise<InputData> {
    const registry = await this.loadRegistry();
    const sessionsInput = await this.loadSessionsInputData(registry);
    return { registry, sessionsInput };
  }

  private async loadRegistry(): Promise<Registry> {
    const registryFilename = path.join(this.inputDir, 'registry.json');
    return (await Bun.file(registryFilename).json()) as Registry;
  }

  private loadSessionsInputData(registry: Registry): Promise<SessionInput[]> {
    return Promise.all(
      registry.sessions.map(async (session) => {
        const sessionDir = path.join(this.inputDir, session.date);
        const sessionScanPath = path.join(sessionDir, `session-scan-${session.date}.json`);
        const votings = await readJsonOrDefault<SessionScan>(sessionScanPath, []);
        assertKnownVoteCodes(votings, sessionScanPath);
        const speeches = await readJsonOrDefault<SessionSpeech[]>(
          path.join(sessionDir, `session-speeches-${session.date}.json`),
          [],
        );
        return { session, votings, speeches } satisfies SessionInput;
      }),
    );
  }
}

async function readJsonOrDefault<T>(filename: string, defaultValue: T): Promise<T> {
  const file = Bun.file(filename);
  return (await file.exists()) ? ((await file.json()) as T) : defaultValue;
}
