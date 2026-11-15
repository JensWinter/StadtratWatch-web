import { describe, expect, it } from 'bun:test';

import type {
  OparlAgendaItem,
  OparlConsultation,
  OparlFile,
  OparlMeeting,
  OparlOrganization,
  OparlPaper,
} from '@srw-astro/models/oparl';
import type { PaperIndex, PaperReferenceMap } from '@srw-astro/models/oparl-derivatives';

import type { OparlObjectsStore } from '../../shared/oparl/oparl-objects-store.ts';
import type { DerivativesWriter } from '../derivatives-writer.ts';
import { OparlDerivativesGenerator } from '../oparl-derivatives-generator.ts';

class MockOparlObjectsStore implements OparlObjectsStore {
  loadConsultations = (): OparlConsultation[] => [];

  loadMeetings = (): OparlMeeting[] => [];

  loadAgendaItems = (): OparlAgendaItem[] => [];

  loadPapers = (): OparlPaper[] => [
    paper('300', '2024-08-01', 'Antrag', 'A0123'),
    paper('100', '2024-07-15', 'Beschlussvorlage', 'B0456'),
    // Sub paper (has subordinatedPaper) -> excluded from the index.
    { ...paper('400', '2024-08-05'), subordinatedPaper: [url('papers/100')] },
    // Main paper without a date -> excluded from the index.
    { ...paper('500', undefined) },
    // Amendment: sub paper with a reference -> in the reference map, not in the index.
    { ...paper('600', '2024-08-06', 'Änderungsantrag', 'A0123/1'), subordinatedPaper: [url('papers/300')] },
  ];

  loadFiles = (): OparlFile[] => [];

  loadOrganizations = (): OparlOrganization[] => [];
}

class MockDerivativesWriter implements DerivativesWriter {
  paperIndex: PaperIndex = [];
  paperReferenceMap: PaperReferenceMap = {};

  writePaperIndex(paperIndex: PaperIndex): Promise<void> {
    this.paperIndex = paperIndex;
    return Promise.resolve();
  }

  writePaperReferenceMap(paperReferenceMap: PaperReferenceMap): Promise<void> {
    this.paperReferenceMap = paperReferenceMap;
    return Promise.resolve();
  }
}

describe('Generating OParl derivates', () => {
  let oparlObjectsStore: MockOparlObjectsStore;
  let writer: MockDerivativesWriter;

  it('projects all dated main papers into a sorted paper index', async () => {
    givenStoresAreAvailable();

    await runGeneration();

    expect(writer.paperIndex).toEqual([
      {
        oparlId: url('papers/100'),
        id: '100',
        date: '2024-07-15',
        paperType: 'Beschlussvorlage',
        reference: 'B0456',
        name: 'Paper 100',
      },
      {
        oparlId: url('papers/300'),
        id: '300',
        date: '2024-08-01',
        paperType: 'Antrag',
        reference: 'A0123',
        name: 'Paper 300',
      },
    ]);
  });

  it('maps the Drucksachennummer of every paper, amendments included, to its paper id', async () => {
    givenStoresAreAvailable();

    await runGeneration();

    expect(writer.paperReferenceMap).toEqual({
      A0123: 300,
      'A0123/1': 600,
      B0456: 100,
    });
  });

  function givenStoresAreAvailable() {
    oparlObjectsStore = new MockOparlObjectsStore();
    writer = new MockDerivativesWriter();
  }

  async function runGeneration() {
    await new OparlDerivativesGenerator(oparlObjectsStore, writer).generate();
  }
});

function url(suffix: string): string {
  return `https://example.org/oparl/${suffix}`;
}

function paper(idSuffix: string, date: string | undefined, paperType?: string, reference?: string): OparlPaper {
  return {
    id: url(`papers/${idSuffix}`),
    type: 't',
    name: `Paper ${idSuffix}`,
    date,
    paperType,
    reference,
    subordinatedPaper: [],
  };
}
