import type { PaperReferenceMap } from '@srw-astro/models/oparl-derivatives';
import type { SessionScan } from '@srw-astro/models/session-scan';

import type { CheckInputStore, SessionScanSource } from './data-store.ts';

export type UnknownPaperReference = {
  sessionDate: string;
  agendaItem: string;
  motionId: string;
};

export class PaperReferenceChecker {
  constructor(private readonly store: CheckInputStore) {}

  public async check(sessionDate?: string): Promise<UnknownPaperReference[]> {
    const paperReferenceMap = await this.store.loadPaperReferenceMap();
    const sessionScans = await this.store.listSessionScans();
    const sessionScansToCheck = sessionDate ? [selectSession(sessionScans, sessionDate)] : sessionScans;

    const unknownReferences: UnknownPaperReference[] = [];
    for (const sessionScanSource of sessionScansToCheck) {
      const sessionScan = await sessionScanSource.loadSessionScan();
      unknownReferences.push(
        ...findUnknownPaperReferences(sessionScanSource.sessionDate, sessionScan, paperReferenceMap),
      );
    }
    return unknownReferences;
  }
}

function selectSession(sessionScans: SessionScanSource[], sessionDate: string): SessionScanSource {
  const sessionScan = sessionScans.find((candidate) => candidate.sessionDate === sessionDate);
  if (!sessionScan) {
    throw new Error(`No session scan found for session ${sessionDate}.`);
  }
  return sessionScan;
}

function findUnknownPaperReferences(
  sessionDate: string,
  sessionScan: SessionScan,
  paperReferenceMap: PaperReferenceMap,
): UnknownPaperReference[] {
  return sessionScan
    .map((voting) => voting.votingSubject)
    .filter(({ motionId }) => motionId.trim() !== '' && !Object.hasOwn(paperReferenceMap, motionId))
    .map(({ agendaItem, motionId }) => ({ sessionDate, agendaItem, motionId }));
}
