import {
  createVotingPaperResolver,
  type VotingPaperResolver,
} from '@models/voting-paper.ts';
import { getEntry } from 'astro:content';

let votingPaperResolverLoading: Promise<VotingPaperResolver> | undefined;

export function getVotingPaperResolver(): Promise<VotingPaperResolver> {
  votingPaperResolverLoading ??= loadVotingPaperResolver();
  return votingPaperResolverLoading;
}

async function loadVotingPaperResolver(): Promise<VotingPaperResolver> {
  const paperReferenceMapEntry = await getEntry(
    'paperReferenceMap',
    'paper-reference-map',
  );
  return createVotingPaperResolver(paperReferenceMapEntry?.data ?? {});
}
