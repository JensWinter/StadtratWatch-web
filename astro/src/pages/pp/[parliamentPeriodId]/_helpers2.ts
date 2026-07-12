import type { SessionScanItem } from '@models/session-scan';
import type { VotingPaperMap } from '@models/oparl-derivatives.ts';
import { getEntry } from 'astro:content';

export function getPaperId(
  votingPaperMap: VotingPaperMap,
  sessionDate: string,
  voting: SessionScanItem,
): number | null {
  return votingPaperMap[sessionDate]?.[voting.votingSubject.agendaItem] ?? null;
}

export async function getVotingPaperMap(
  parliamentPeriodId: string,
): Promise<VotingPaperMap> {
  return (await getEntry('votingPaperMaps', parliamentPeriodId))?.data ?? {};
}
