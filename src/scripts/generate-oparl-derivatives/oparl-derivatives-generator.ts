import type { OparlPaper } from '@srw-astro/models/oparl';
import type { PaperIndex, PaperIndexEntry, PaperReferenceMap } from '@srw-astro/models/oparl-derivatives';

import type { OparlObjectsStore } from '../shared/oparl/oparl-objects-store.ts';
import { OparlPapersInMemoryRepository, type OparlPapersRepository } from '../shared/oparl/oparl-papers-repository.ts';
import type { DerivativesWriter } from './derivatives-writer.ts';

export class OparlDerivativesGenerator {
  private readonly papersRepository: OparlPapersRepository;

  constructor(
    private readonly oparlObjectsStore: OparlObjectsStore,
    private readonly writer: DerivativesWriter,
  ) {
    this.papersRepository = new OparlPapersInMemoryRepository(this.oparlObjectsStore.loadPapers());
  }

  public async generate(): Promise<void> {
    console.log('Generating global paper-index');
    await this.writer.writePaperIndex(this.buildPaperIndex());

    console.log('Generating global paper-reference-map');
    await this.writer.writePaperReferenceMap(this.buildPaperReferenceMap());
  }

  private buildPaperIndex(): PaperIndex {
    return this.papersRepository
      .getAllPapers()
      .filter((paper) => (paper.subordinatedPaper || []).length === 0)
      .filter((paper) => !!paper.date)
      .map<PaperIndexEntry>((paper) => ({
        oparlId: paper.id,
        id: oparlIdSuffix(paper.id),
        date: paper.date!,
        paperType: paper.paperType,
        reference: paper.reference,
        name: paper.name,
      }))
      .toSorted((a, b) => {
        const idComparison = +a.id - +b.id;
        return idComparison !== 0 ? idComparison : a.date.localeCompare(b.date);
      });
  }

  private buildPaperReferenceMap(): PaperReferenceMap {
    const papersWithReference = this.papersRepository
      .getAllPapers()
      .filter((paper): paper is OparlPaper & { reference: string } => !!paper.reference)
      .toSorted((a, b) => a.reference.localeCompare(b.reference));

    const paperReferenceMap: PaperReferenceMap = {};
    for (const paper of papersWithReference) {
      if (paper.reference in paperReferenceMap) {
        console.warn(`Drucksachennummer ${paper.reference} occurs more than once; ignoring ${paper.id}`);
        continue;
      }
      const paperId = numericPaperId(paper.id);
      if (paperId === null) {
        continue;
      }
      paperReferenceMap[paper.reference] = paperId;
    }

    return paperReferenceMap;
  }
}

function oparlIdSuffix(oparlId: string): string {
  return oparlId.split('/').pop()!;
}

function numericPaperId(paperOparlId: string): number | null {
  const paperId = Number(oparlIdSuffix(paperOparlId));
  if (Number.isNaN(paperId)) {
    console.warn(`Skipping non-numeric paper id derived from ${paperOparlId}`);
    return null;
  }
  return paperId;
}
