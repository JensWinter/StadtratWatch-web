import { describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { OparlDerivativesGenerator } from '../oparl-derivatives-generator.ts';
import { OparlObjectsStore } from '../../shared/oparl/oparl-objects-store.ts';
import { RegistryStore } from '../registry-store.ts';
import { DerivativesWriter } from '../derivatives-writer.ts';
import { Registry } from '@srw-astro/models/registry';
import {
  OparlAgendaItem,
  OparlConsultation,
  OparlFile,
  OparlMeeting,
  OparlOrganization,
  OparlPaper,
} from '@srw-astro/models/oparl';
import { PaperIndex, VotingPaperMap } from '@srw-astro/models/oparl-derivatives';

const COUNCIL_ORG = 'https://example.org/oparl/organizations/gr/1';
const OTHER_ORG = 'https://example.org/oparl/organizations/committee/1';

class MockOparlObjectsStore implements OparlObjectsStore {
  loadConsultations = (): OparlConsultation[] => [
    consultation('c1', 'papers/100'),
    consultation('c2', 'papers/200'),
    // A consultation without a paper -> agenda item resolves to nothing.
    { id: url('consultations/c3'), type: 't', name: 'c3', paper: undefined },
  ];

  loadMeetings = (): OparlMeeting[] => [
    {
      id: url('meetings/m1'),
      type: 't',
      name: 'Council',
      start: '2024-08-15T16:00:00+02:00',
      organization: [COUNCIL_ORG],
    },
    // Same day as m1 but a non-council org -> must be ignored.
    {
      id: url('meetings/m2'),
      type: 't',
      name: 'Committee',
      start: '2024-08-15T10:00:00+02:00',
      organization: [OTHER_ORG],
    },
    {
      id: url('meetings/m3'),
      type: 't',
      name: 'Council',
      start: '2024-09-12T16:00:00+02:00',
      organization: [COUNCIL_ORG],
    },
  ];

  loadAgendaItems = (): OparlAgendaItem[] => [
    agendaItem('a1', 'meetings/m1', '4.1', 'consultations/c1'),
    agendaItem('a2', 'meetings/m1', '4.2', 'consultations/c2'),
    // Number without a resolvable paper.
    agendaItem('a3', 'meetings/m1', '4.3', 'consultations/c3'),
    // Agenda item without a number is skipped.
    agendaItem('a4', 'meetings/m1', undefined, 'consultations/c1'),
    // Belongs to the committee meeting -> must not appear.
    agendaItem('a5', 'meetings/m2', '9.9', 'consultations/c1'),
    // Session m3 has no agenda items with papers -> session omitted.
  ];

  loadPapers = (): OparlPaper[] => [
    paper('300', '2024-08-01', 'Antrag', 'A0123'),
    paper('100', '2024-07-15', 'Beschlussvorlage', 'B0456'),
    // Sub paper (has subordinatedPaper) -> excluded from the index.
    { ...paper('400', '2024-08-05'), subordinatedPaper: [url('papers/100')] },
    // Main paper without a date -> excluded from the index.
    { ...paper('500', undefined) },
  ];

  loadFiles = (): OparlFile[] => [];

  loadOrganizations = (): OparlOrganization[] => [];
}

const CANONICAL_PERIOD_ID = 'example-8';

class MockRegistryStore implements RegistryStore {
  loadRegistries = (): Registry[] => [
    {
      id: CANONICAL_PERIOD_ID,
      name: 'Example period',
      lastUpdate: '2024-10-01',
      sessions: [
        session('2024-09-12'),
        session('2024-08-15'),
        // Registry session without a matching OParl meeting -> skipped.
        session('2024-10-10'),
      ],
      factions: [],
      parties: [],
      persons: [],
    },
  ];
}

class MockDerivativesWriter implements DerivativesWriter {
  votingPaperMaps: { [periodId: string]: VotingPaperMap } = {};
  paperIndex: PaperIndex = [];

  writeVotingPaperMap(periodId: string, votingPaperMap: VotingPaperMap): void {
    this.votingPaperMaps[periodId] = votingPaperMap;
  }

  writePaperIndex(paperIndex: PaperIndex): void {
    this.paperIndex = paperIndex;
  }
}

describe('Generating OParl derivates', () => {
  let oparlObjectsStore: MockOparlObjectsStore;
  let registryStore: MockRegistryStore;
  let writer: MockDerivativesWriter;

  it('maps session agenda item numbers to paper ids for council meetings only', () => {
    givenStoresAreAvailable();

    runGeneration();

    assertEquals(writer.votingPaperMaps[CANONICAL_PERIOD_ID], {
      '2024-08-15': { '4.1': 100, '4.2': 200 },
    });
  });

  it('writes the voting-paper-map under the canonical registry id', () => {
    givenStoresAreAvailable();

    runGeneration();

    assertEquals(Object.keys(writer.votingPaperMaps), [CANONICAL_PERIOD_ID]);
  });

  it('projects all dated main papers into a sorted paper index', () => {
    givenStoresAreAvailable();

    runGeneration();

    assertEquals(writer.paperIndex, [
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

  function givenStoresAreAvailable() {
    oparlObjectsStore = new MockOparlObjectsStore();
    registryStore = new MockRegistryStore();
    writer = new MockDerivativesWriter();
  }

  function runGeneration() {
    new OparlDerivativesGenerator(oparlObjectsStore, registryStore, writer, COUNCIL_ORG).generate();
  }
});

function url(suffix: string): string {
  return `https://example.org/oparl/${suffix}`;
}

function consultation(id: string, paperSuffix: string): OparlConsultation {
  return { id: url(`consultations/${id}`), type: 't', name: id, paper: url(paperSuffix) };
}

function agendaItem(
  id: string,
  meetingSuffix: string,
  number: string | undefined,
  consultationSuffix: string,
): OparlAgendaItem {
  return {
    id: url(`agenda-items/${id}`),
    type: 't',
    name: id,
    order: 0,
    meeting: url(meetingSuffix),
    number,
    consultation: url(consultationSuffix),
  };
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

function session(date: string) {
  return { id: date, date, title: `Session ${date}`, youtubeUrl: '', meetingMinutesUrl: null, approved: true };
}
