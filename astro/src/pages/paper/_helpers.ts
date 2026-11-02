import type {
  PaperVotingItem,
  PaperVotingsDto,
} from '@models/paper-votings.ts';
import type { VoteCode } from '@models/Session.ts';
import { formatDate } from '@utils/format-date.ts';

export type PaperVotingView = PaperVotingItem & {
  dateDisplay: string;
  periodBadgeLabel: string;
};

const periodNumberPattern = /-(\d+)$/;

// Only cast votes get a color; non-votes keep daisyUI's faint default dot,
// matching how the session page renders the same breakdown.
const voteStatusClasses: Record<VoteCode, string> = {
  J: 'status-success',
  N: 'status-error',
  E: 'status-warning',
  O: '',
};

export function selectPaperVotings(
  batch: PaperVotingsDto[],
  paperId: number,
): PaperVotingItem[] {
  return batch.find((entry) => entry.paperId === paperId)?.votings ?? [];
}

export function spansMultipleParliamentPeriods(
  votings: PaperVotingItem[],
): boolean {
  return new Set(votings.map((voting) => voting.parliamentPeriodId)).size > 1;
}

function toPeriodBadgeLabel(parliamentPeriodId: string): string {
  const periodNumber = parliamentPeriodId.match(periodNumberPattern)?.[1];
  return periodNumber ? `WP ${periodNumber}` : parliamentPeriodId;
}

export function toPaperVotingViews(
  votings: PaperVotingItem[],
): PaperVotingView[] {
  return votings.map((voting) => ({
    ...voting,
    dateDisplay: formatDate(voting.date),
    periodBadgeLabel: toPeriodBadgeLabel(voting.parliamentPeriodId),
  }));
}

export function getVoteStatusClass(vote: VoteCode): string {
  return voteStatusClasses[vote];
}
