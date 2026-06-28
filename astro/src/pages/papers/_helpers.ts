import type { PaperIndexItem } from '@models/oparl-prepared.ts';
import type { RecentPaper } from './_models.ts';
import { formatDate } from '@utils/format-date.ts';

// The papers index is already restricted to main papers with a date by the
// generate-oparl-assets precompile step; only the rolling date window stays here
// so the list refreshes on every deploy.
export function getRecentMainPapers(papers: PaperIndexItem[]): RecentPaper[] {
  const today = new Date();
  const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);

  return papers
    .filter((paper) => new Date(paper.date) >= threeMonthsAgo)
    .map<RecentPaper>((paper) => ({
      oparlId: paper.id,
      id: paper.id.split('/').pop()!,
      date: paper.date,
      dateDisplay: formatDate(paper.date),
      type: paper.paperType,
      reference: paper.reference,
      title: paper.name,
    }));
}

export function getRecentPapersPeriod() {
  const now = new Date();
  const currentMonth = now.toLocaleDateString('de-DE', { month: 'long' });
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const twoMonthsAgoName = twoMonthsAgo.toLocaleDateString('de-DE', {
    month: 'long',
  });

  return `${twoMonthsAgoName} - ${currentMonth}`;
}
