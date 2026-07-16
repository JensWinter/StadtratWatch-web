import { describe, it } from '@std/testing/bdd';
import { assert } from '@std/assert';
import { PaperAssetsGenerator } from '../paper-assets-generator.ts';
import { OparlObjectsStore } from '../../shared/oparl/oparl-objects-store.ts';
import { PaperAssetsWriter } from '../paper-assets-writer.ts';
import {
  OparlAgendaItem,
  OparlConsultation,
  OparlFile,
  OparlMeeting,
  OparlOrganization,
  OparlPaper,
} from '@srw-astro/models/oparl';
import { PaperAssetDto, PaperGraphAssetDto } from '../model.ts';
import { PaperFilesStore } from '../paper-files-store.ts';
import { PaperGraphAssetsWriter } from '../paper-graph-assets-writer.ts';
import { SessionIndex, SessionIndexStore } from '../session-index.ts';

class MockPaperFilesStore implements PaperFilesStore {
  getFileSize(_fileId: number): number | null {
    return null;
  }
}

class MockOparlObjectsStore implements OparlObjectsStore {
  loadAgendaItems = (): OparlAgendaItem[] => [];

  loadConsultations = (): OparlConsultation[] => [];

  loadFiles = (): OparlFile[] => [];

  loadMeetings = (): OparlMeeting[] => [];

  loadOrganizations = (): OparlOrganization[] => [];

  // Sample paper graph structure:
  //
  //     1 → 3 → 6
  //     ↓   ↓
  //     ↓   7
  //     ↓
  //     4 ← 2 → 5
  //
  //     8 → 9 → 11
  //     ↓   ↓
  //     ↓   12
  //     ↓
  //     10
  //
  //     13 → 14
  //      ↓
  //      15
  //
  //     16 → 17
  //
  //     18 (isolated)
  //
  loadPapers = (): OparlPaper[] => [
    this.createOparlPaper(10, [], [30, 40]),
    this.createOparlPaper(20, [], [40, 50]),
    this.createOparlPaper(30, [10], [60, 70]),
    this.createOparlPaper(40, [10, 20], []),
    this.createOparlPaper(50, [20], []),
    this.createOparlPaper(60, [30], []),
    this.createOparlPaper(70, [30], []),
    this.createOparlPaper(80, [], [90, 100]),
    this.createOparlPaper(90, [80], [110, 120]),
    this.createOparlPaper(100, [80], []),
    this.createOparlPaper(110, [90], []),
    this.createOparlPaper(120, [90], []),
    this.createOparlPaper(130, [], [140, 150]),
    this.createOparlPaper(140, [130], []),
    this.createOparlPaper(150, [130], []),
    this.createOparlPaper(160, [], [170]),
    this.createOparlPaper(170, [160], []),
    this.createOparlPaper(180, [], []),
  ];

  private createOparlPaper(id: number, superordinatedIds: number[], subordinatedIds: number[]): OparlPaper {
    const createOparlPaperId = (id: number) => `http://example.com/oparl/v1/papers/${id}`;
    return {
      id: createOparlPaperId(id),
      type: 'https://schema.oparl.org/1.1/Paper',
      name: `Paper ${id}`,
      // CAUTION! SubordinatedIds and superordinatedIds are swapped here,
      // due to a quirk in the OParl implementation of the SOMACOS system.
      subordinatedPaper: superordinatedIds.map(createOparlPaperId),
      superordinatedPaper: subordinatedIds.map(createOparlPaperId),
    };
  }
}

class MockSessionIndexStore implements SessionIndexStore {
  constructor(private readonly sessionIndex: SessionIndex = {}) {
  }

  loadSessionIndex = (): SessionIndex => this.sessionIndex;
}

class MockPaperAssetsWriter implements PaperAssetsWriter {
  papersWritten = 0;
  paperAssetsWritten = 0;

  writePaperAssets(assets: PaperAssetDto[]): void {
    this.papersWritten = assets.map((a) => a.papers.length).reduce((a, b) => a + b, 0);
    this.paperAssetsWritten = assets.length;
  }
}

class MockPaperGraphAssetsWriter implements PaperGraphAssetsWriter {
  paperGraphsWritten = 0;
  paperGraphAssetsWritten = 0;

  writePaperGraphAssets(assets: PaperGraphAssetDto[]): void {
    this.paperGraphsWritten = assets.map((a) => a.paperGraphs.length).reduce((a, b) => a + b, 0);
    this.paperGraphAssetsWritten = assets.length;
  }
}

describe('Generating paper assets', () => {
  let paperFilesStore: MockPaperFilesStore;
  let oparlObjectsStore: MockOparlObjectsStore;
  let sessionIndexStore: MockSessionIndexStore;
  let paperAssetsWriter: MockPaperAssetsWriter;
  let paperGraphAssetsWriter: MockPaperGraphAssetsWriter;

  it('writes papers into assets', () => {
    // GIVEN
    paperFilesStoreIsAvailable();
    oparlObjectStoreIsAvailable();
    sessionIndexStoreIsAvailable();
    paperAssetsWriterIsAvailable();
    paperGraphAssetWriterIsAvailable();

    // WHEN
    runPaperAssetsGeneration();

    // THEN
    assert(papersAreWritten());
    assert(paperAssetsAreWritten());
  });

  it('writes paper graphs into assets', () => {
    // GIVEN
    paperFilesStoreIsAvailable();
    oparlObjectStoreIsAvailable();
    sessionIndexStoreIsAvailable();
    paperAssetsWriterIsAvailable();
    paperGraphAssetWriterIsAvailable();

    // WHEN
    runPaperAssetsGeneration();

    // THEN
    assert(paperGraphsAreWritten(), 'Expected paper graphs to be written');
    assert(paperGraphAssetsAreWritten(), 'Expected paper graph assets to be written');
  });

  function paperFilesStoreIsAvailable() {
    paperFilesStore = new MockPaperFilesStore();
  }

  function oparlObjectStoreIsAvailable() {
    oparlObjectsStore = new MockOparlObjectsStore();
  }

  function sessionIndexStoreIsAvailable(sessionIndex: SessionIndex = {}) {
    sessionIndexStore = new MockSessionIndexStore(sessionIndex);
  }

  function paperAssetsWriterIsAvailable() {
    paperAssetsWriter = new MockPaperAssetsWriter();
  }

  function paperGraphAssetWriterIsAvailable() {
    paperGraphAssetsWriter = new MockPaperGraphAssetsWriter();
  }

  function runPaperAssetsGeneration() {
    const generator = new PaperAssetsGenerator(
      paperFilesStore,
      oparlObjectsStore,
      sessionIndexStore,
      paperAssetsWriter,
      paperGraphAssetsWriter,
    );
    generator.generatePaperAssets();
  }

  function papersAreWritten() {
    return paperAssetsWriter.papersWritten === 18;
  }

  function paperAssetsAreWritten() {
    return paperAssetsWriter.paperAssetsWritten === 2;
  }

  function paperGraphsAreWritten() {
    return paperGraphAssetsWriter.paperGraphsWritten === 6;
  }

  function paperGraphAssetsAreWritten() {
    return paperGraphAssetsWriter.paperGraphAssetsWritten === 2;
  }
});
