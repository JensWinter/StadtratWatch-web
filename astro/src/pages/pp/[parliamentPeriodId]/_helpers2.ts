import type { SessionScanItem } from '@models/session-scan';
import type { VotingPaperMap } from '@models/oparl-derivatives.ts';

export function getPaperId(
  votingPaperMap: VotingPaperMap,
  sessionDate: string,
  voting: SessionScanItem,
): number | null {
  return votingPaperMap[sessionDate]?.[voting.votingSubject.agendaItem] ?? null;
}
