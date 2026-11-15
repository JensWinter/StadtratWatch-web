import type { PaperReferenceMap } from './oparl-derivatives.ts';
import type { SessionScanVotingSubject } from './session-scan.ts';

export type VotingPaperResolver = (
  votingSubject: Pick<SessionScanVotingSubject, 'motionId'>,
) => number | null;

export function createVotingPaperResolver(
  paperReferenceMap: PaperReferenceMap,
): VotingPaperResolver {
  const paperIdByReference = new Map(
    Object.entries(paperReferenceMap).map(([reference, paperId]) => [
      withoutWhitespace(reference),
      paperId,
    ]),
  );
  return (votingSubject) =>
    paperIdByReference.get(withoutWhitespace(votingSubject.motionId)) ?? null;
}

function withoutWhitespace(reference: string): string {
  return reference.replace(/\s/g, '');
}
