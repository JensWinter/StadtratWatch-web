import type { SessionScanItem } from '@models/session-scan';
import type { VotingPaperMap } from '@models/oparl-derivatives.ts';
import { getEntry } from 'astro:content';

export function getPaperId(
  votingPaperMap: VotingPaperMap,
  sessionDate: string,
  voting: SessionScanItem,
): number | null {
  const paperId =
    votingPaperMap[sessionDate]?.[voting.votingSubject.agendaItem];
  if (paperId === undefined) {
    console.warn(
      `No paperId found in voting-paper-map for session ${sessionDate}, agendaItem ${voting.votingSubject.agendaItem}`,
    );
    return null;
  }
  return paperId;
}

export async function getVotingPaperMap(
  parliamentPeriodId: string,
): Promise<VotingPaperMap> {
  return (await getEntry('votingPaperMaps', parliamentPeriodId))?.data ?? {};
}
