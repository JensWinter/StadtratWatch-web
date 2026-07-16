// Papers are grouped into fixed-size batches so a paper page can fetch one asset file instead of a full index.
// The generators write papers-{batchNo}.json, paper-graphs-{batchNo}.json and paper-votings-{batchNo}.json,
// and the web client derives the same batchNo to locate them. Changing these values invalidates published assets.
export const PAPER_BATCH_SIZE = 100;
export const PAPER_BATCH_NO_DIGITS = 4;

export function toPaperBatchNo(paperId: number): string {
  return `${Math.floor(paperId / PAPER_BATCH_SIZE)}`.padStart(
    PAPER_BATCH_NO_DIGITS,
    '0',
  );
}
