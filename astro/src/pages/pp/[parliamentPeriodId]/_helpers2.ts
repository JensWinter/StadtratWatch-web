import type { SessionScanItem } from '@models/session-scan';
import {
  resolveVotingPaperId,
  type VotingPaperDerivates,
} from '@models/voting-paper.ts';
import { getEntry } from 'astro:content';

export function getPaperId(
  derivates: VotingPaperDerivates,
  sessionDate: string,
  voting: SessionScanItem,
): number | null {
  const paperId = resolveVotingPaperId(
    derivates,
    sessionDate,
    voting.votingSubject,
  );
  if (paperId === null) {
    console.warn(
      `No paperId found for session ${sessionDate}, agendaItem ${voting.votingSubject.agendaItem}, motionId ${voting.votingSubject.motionId}`,
    );
  }
  return paperId;
}

export async function getVotingPaperDerivates(
  parliamentPeriodId: string,
): Promise<VotingPaperDerivates> {
  const [votingPaperMapEntry, paperReferenceMapEntry] = await Promise.all([
    getEntry('votingPaperMaps', parliamentPeriodId),
    getEntry('paperReferenceMap', 'paper-reference-map'),
  ]);
  return {
    votingPaperMap: votingPaperMapEntry?.data ?? {},
    paperReferenceMap: paperReferenceMapEntry?.data ?? {},
  };
}
