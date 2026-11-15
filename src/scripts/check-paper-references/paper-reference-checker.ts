import type { PaperReferenceMap } from '@srw-astro/models/oparl-derivatives';
import type { SessionScan } from '@srw-astro/models/session-scan';

import type { CheckInputStore, SessionScansByDate } from './data-store.ts';

export type UnknownPaperReference = {
  sessionDate: string;
  agendaItem: string;
  motionId: string;
};

export class PaperReferenceChecker {
  constructor(private readonly store: CheckInputStore) {}

  public async check(sessionDate?: string): Promise<UnknownPaperReference[]> {
    const paperReferenceMap = await this.store.loadPaperReferenceMap();
    const sessionScansByDate = await this.store.loadSessionScansByDate();
    const sessionScansToCheck = sessionDate ? selectSession(sessionScansByDate, sessionDate) : sessionScansByDate;

    return Object.entries(sessionScansToCheck).flatMap(([checkedSessionDate, sessionScan]) =>
      findUnknownPaperReferences(checkedSessionDate, sessionScan, paperReferenceMap),
    );
  }
}

function selectSession(sessionScansByDate: SessionScansByDate, sessionDate: string): SessionScansByDate {
  const sessionScan = sessionScansByDate[sessionDate];
  if (!sessionScan) {
    throw new Error(`No session scan found for session ${sessionDate}.`);
  }
  return { [sessionDate]: sessionScan };
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
