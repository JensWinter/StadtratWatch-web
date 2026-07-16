import type { PaperVotingsDto } from '@srw-astro/models/paper-votings';

export type PaperVotingsAssetDto = {
  batchNo: string;
  paperVotings: PaperVotingsDto[];
};
