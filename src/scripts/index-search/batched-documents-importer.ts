import type { IDocumentsImporter, IndexedPaper, IndexedSpeech } from './typesense-importer.ts';

export class BatchedDocumentsImporter implements IDocumentsImporter {
  constructor(
    private readonly importer: IDocumentsImporter,
    private readonly maxBatchSize: number,
  ) {}

  public async importPapers(papers: IndexedPaper[]): Promise<boolean> {
    for (let i = 0; i < papers.length; i += this.maxBatchSize) {
      console.log(
        `Importing papers ${i + 1} to ${Math.min(i + this.maxBatchSize, papers.length)} of ${papers.length}...`,
      );
      const papersBatch = papers.slice(i, i + this.maxBatchSize);
      if (!(await this.importer.importPapers(papersBatch))) {
        return false;
      }
    }

    return true;
  }

  public async importSpeeches(speeches: IndexedSpeech[]): Promise<boolean> {
    for (let i = 0; i < speeches.length; i += this.maxBatchSize) {
      console.log(
        `Importing speeches ${i + 1} to ${Math.min(i + this.maxBatchSize, speeches.length)} of ${speeches.length}...`,
      );
      const speechesBatch = speeches.slice(i, i + this.maxBatchSize);
      if (!(await this.importer.importSpeeches(speechesBatch))) {
        return false;
      }
    }

    return true;
  }
}
