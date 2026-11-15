import type { PaperReferenceMap, VotingPaperMap } from './oparl-derivatives.ts';
import type { SessionScanVotingSubject } from './session-scan.ts';

export type VotingPaperDerivates = {
  votingPaperMap: VotingPaperMap;
  paperReferenceMap: PaperReferenceMap;
};

export function resolveVotingPaperId(
  derivates: VotingPaperDerivates,
  sessionDate: string,
  votingSubject: Pick<SessionScanVotingSubject, 'agendaItem' | 'motionId'>,
): number | null {
  const sessionAgenda = derivates.votingPaperMap[sessionDate] ?? {};
  const referencedPaperId =
    derivates.paperReferenceMap[votingSubject.motionId.trim()];
  if (
    referencedPaperId !== undefined &&
    Object.values(sessionAgenda).includes(referencedPaperId)
  ) {
    return referencedPaperId;
  }
  return sessionAgenda[votingSubject.agendaItem] ?? referencedPaperId ?? null;
}

export type PaperReferenceLookup = (reference: string) => number | undefined;

// Whitespace is ignored on both sides: scans have stray spaces, and OParl itself
// writes some Drucksachennummern with one (e.g. `A0024/25 /1`).
export function createPaperReferenceLookup(
  paperReferenceMap: PaperReferenceMap,
): PaperReferenceLookup {
  const paperIdsByReference = new Map(
    Object.entries(paperReferenceMap).map(([reference, paperId]) => [
      removeWhitespace(reference),
      paperId,
    ]),
  );
  return (reference) => paperIdsByReference.get(removeWhitespace(reference));
}

function removeWhitespace(reference: string): string {
  return reference.replace(/\s/g, '');
}
