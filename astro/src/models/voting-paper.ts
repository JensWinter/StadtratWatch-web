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
