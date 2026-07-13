import type { PaperIndexEntry } from '@models/oparl-derivatives.ts';
import type { RecentPaper } from './_models.ts';
import { formatDate } from '@utils/format-date.ts';

export function getRecentMainPapers(papers: PaperIndexEntry[]): RecentPaper[] {
  const today = new Date();
  const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);

  return papers
    .filter((paper) => new Date(paper.date) >= threeMonthsAgo)
    .map<RecentPaper>((paper) => ({
      ...paper,
      dateDisplay: formatDate(paper.date),
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
