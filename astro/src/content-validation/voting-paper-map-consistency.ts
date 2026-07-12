import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Registry } from '@models/registry.ts';
import type { VotingPaperMap } from '@models/oparl-derivatives.ts';

// Forward direction only: a registry session may legitimately be absent from the
// derivate (a session can have no paper-linked votings), so the reverse is not an error.

export type PeriodConsistencyInput = {
  periodId: string;
  registrySessionDates: string[];
  votingPaperMapSessionKeys: string[];
};

export function collectVotingPaperMapInconsistencies(
  periods: PeriodConsistencyInput[],
): string[] {
  const inconsistencies: string[] = [];
  for (const period of periods) {
    const knownSessionDates = new Set(period.registrySessionDates);
    for (const sessionKey of period.votingPaperMapSessionKeys) {
      if (!knownSessionDates.has(sessionKey)) {
        inconsistencies.push(
          `Session ${sessionKey} in voting-paper-map is missing from registry of period ${period.periodId}`,
        );
      }
    }
  }
  return inconsistencies;
}

export function assertVotingPaperMapConsistency(
  periods: PeriodConsistencyInput[],
): void {
  const inconsistencies = collectVotingPaperMapInconsistencies(periods);
  if (inconsistencies.length > 0) {
    throw new Error(
      `voting-paper-map consistency check failed with ${inconsistencies.length} issue(s):\n` +
        inconsistencies.map((issue) => `  - ${issue}`).join('\n'),
    );
  }
}

export function validateVotingPaperMapConsistency(
  dataDir = defaultDataDir(),
): void {
  assertVotingPaperMapConsistency(readPeriodsFromDisk(dataDir));
}

function defaultDataDir(): string {
  return path.resolve(process.cwd(), '..', 'data');
}

function readPeriodsFromDisk(dataDir: string): PeriodConsistencyInput[] {
  return fs
    .readdirSync(dataDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(dataDir, entry.name))
    .filter((periodDir) => fs.existsSync(path.join(periodDir, 'registry.json')))
    .map((periodDir) => readPeriod(periodDir));
}

function readPeriod(periodDir: string): PeriodConsistencyInput {
  const registry = readJsonFile<Registry>(
    path.join(periodDir, 'registry.json'),
    periodDir,
  );

  const votingPaperMapPath = path.join(periodDir, 'voting-paper-map.json');
  const votingPaperMap: VotingPaperMap = fs.existsSync(votingPaperMapPath)
    ? readJsonFile<VotingPaperMap>(votingPaperMapPath, periodDir)
    : {};

  return {
    periodId: registry.id,
    registrySessionDates: registry.sessions.map((session) => session.date),
    votingPaperMapSessionKeys: Object.keys(votingPaperMap),
  };
}

function readJsonFile<T>(filePath: string, periodDir: string): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch (cause) {
    throw new Error(
      `Failed to read ${filePath} while validating period ${periodDir}`,
      { cause },
    );
  }
}
