import type { SessionScan } from '@srw-astro/models/session-scan';
import { createPaperReferenceLookup, type PaperReferenceLookup } from '@srw-astro/models/voting-paper';

import type { CheckInputStore, SessionScansByDate } from './data-store.ts';

export type UnknownPaperReference = {
  sessionDate: string;
  agendaItem: string;
  motionId: string;
};

export class PaperReferenceChecker {
  constructor(private readonly store: CheckInputStore) {}

  public async check(sessionDate?: string): Promise<UnknownPaperReference[]> {
    const findPaperId = createPaperReferenceLookup(await this.store.loadPaperReferenceMap());
    const sessionScansByDate = await this.store.loadSessionScansByDate();
    const sessionScansToCheck = sessionDate ? selectSession(sessionScansByDate, sessionDate) : sessionScansByDate;

    return Object.entries(sessionScansToCheck).flatMap(([checkedSessionDate, sessionScan]) =>
      findUnknownPaperReferences(checkedSessionDate, sessionScan, findPaperId),
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
  findPaperId: PaperReferenceLookup,
): UnknownPaperReference[] {
  return sessionScan
    .map((voting) => voting.votingSubject)
    .filter(({ motionId }) => motionId.trim() !== '' && findPaperId(motionId) === undefined)
    .map(({ agendaItem, motionId }) => ({ sessionDate, agendaItem, motionId }));
}
