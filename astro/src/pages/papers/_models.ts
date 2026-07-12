import type { PaperIndexEntry } from '@models/oparl-derivatives.ts';

export type RecentPaper = PaperIndexEntry & {
  dateDisplay: string;
};
