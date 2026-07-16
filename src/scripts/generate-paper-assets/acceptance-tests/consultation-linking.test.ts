import { describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { PaperAssetsGenerator } from '../paper-assets-generator.ts';
import { OparlObjectsStore } from '../../shared/oparl/oparl-objects-store.ts';
import {
  OparlAgendaItem,
  OparlConsultation,
  OparlFile,
  OparlMeeting,
  OparlOrganization,
  OparlPaper,
} from '@srw-astro/models/oparl';
import { PaperAssetDto, PaperConsultationDto, PaperGraphAssetDto } from '../model.ts';
import { PaperFilesStore } from '../paper-files-store.ts';
import { PaperAssetsWriter } from '../paper-assets-writer.ts';
import { PaperGraphAssetsWriter } from '../paper-graph-assets-writer.ts';
import { SessionIndex, SessionIndexStore } from '../session-index.ts';

const COUNCIL_ORGANIZATION = 'http://example.com/oparl/organizations/council';
const MAYOR_ORGANIZATION = 'http://example.com/oparl/organizations/mayor';

const COUNCIL_MEETING_ON_SESSION_DATE = 'http://example.com/oparl/meetings/1';
const COUNCIL_MEETING_WITHOUT_SESSION_PAGE = 'http://example.com/oparl/meetings/2';
const MAYOR_MEETING_ON_SESSION_DATE = 'http://example.com/oparl/meetings/3';

const AGENDA_ITEM_COUNCIL_LINKED = 'http://example.com/oparl/agendaItems/1';
const AGENDA_ITEM_COUNCIL_UNLINKED = 'http://example.com/oparl/agendaItems/2';
const AGENDA_ITEM_MAYOR = 'http://example.com/oparl/agendaItems/3';

const SESSION_DATE = '2024-07-08';
const OTHER_DATE = '2024-06-03';
const PARLIAMENT_PERIOD_ID = 'magdeburg-8';

class MockPaperFilesStore implements PaperFilesStore {
  getFileSize = (_fileId: number): number | null => null;
}

class MockOparlObjectsStore implements OparlObjectsStore {
  loadAgendaItems = (): OparlAgendaItem[] => [
    this.agendaItem(AGENDA_ITEM_COUNCIL_LINKED, '5.1'),
    this.agendaItem(AGENDA_ITEM_COUNCIL_UNLINKED, '5.2'),
    this.agendaItem(AGENDA_ITEM_MAYOR, '5.3'),
  ];

  loadConsultations = (): OparlConsultation[] => [];

  loadFiles = (): OparlFile[] => [];

  loadMeetings = (): OparlMeeting[] => [
    this.meeting(COUNCIL_MEETING_ON_SESSION_DATE, `${SESSION_DATE}T15:00:00+02:00`, COUNCIL_ORGANIZATION),
    this.meeting(COUNCIL_MEETING_WITHOUT_SESSION_PAGE, `${OTHER_DATE}T15:00:00+02:00`, COUNCIL_ORGANIZATION),
    this.meeting(MAYOR_MEETING_ON_SESSION_DATE, `${SESSION_DATE}T10:00:00+02:00`, MAYOR_ORGANIZATION),
  ];

  loadOrganizations = (): OparlOrganization[] => [
    { id: COUNCIL_ORGANIZATION, type: 'https://schema.oparl.org/1.1/Organization', name: 'Stadtrat' },
    { id: MAYOR_ORGANIZATION, type: 'https://schema.oparl.org/1.1/Organization', name: 'Oberbürgermeisterin' },
  ];

  loadPapers = (): OparlPaper[] => [
    {
      id: 'http://example.com/oparl/papers/1',
      type: 'https://schema.oparl.org/1.1/Paper',
      name: 'Paper 1',
      consultation: [
        this.consultation(COUNCIL_MEETING_ON_SESSION_DATE, COUNCIL_ORGANIZATION, AGENDA_ITEM_COUNCIL_LINKED),
        this.consultation(COUNCIL_MEETING_WITHOUT_SESSION_PAGE, COUNCIL_ORGANIZATION, AGENDA_ITEM_COUNCIL_UNLINKED),
        this.consultation(MAYOR_MEETING_ON_SESSION_DATE, MAYOR_ORGANIZATION, AGENDA_ITEM_MAYOR),
      ],
    },
  ];

  private meeting(id: string, start: string, organization: string): OparlMeeting {
    return { id, type: 'https://schema.oparl.org/1.1/Meeting', name: 'Sitzung', start, organization: [organization] };
  }

  private agendaItem(id: string, number: string): OparlAgendaItem {
    return { id, type: 'https://schema.oparl.org/1.1/AgendaItem', name: 'TOP', order: 0, number };
  }

  private consultation(meeting: string, organization: string, agendaItem: string): OparlConsultation {
    return {
      id: `${meeting}-consultation`,
      type: 'https://schema.oparl.org/1.1/Consultation',
      name: 'Beratung',
      meeting,
      organization: [organization],
      agendaItem,
    };
  }
}

class MockSessionIndexStore implements SessionIndexStore {
  constructor(private readonly sessionIndex: SessionIndex) {
  }

  loadSessionIndex = (): SessionIndex => this.sessionIndex;
}

class CapturingPaperAssetsWriter implements PaperAssetsWriter {
  consultations: PaperConsultationDto[] = [];

  writePaperAssets(assets: PaperAssetDto[]): void {
    this.consultations = assets.flatMap((asset) => asset.papers).flatMap((paper) => paper.consultations);
  }
}

class NoopPaperGraphAssetsWriter implements PaperGraphAssetsWriter {
  writePaperGraphAssets(_assets: PaperGraphAssetDto[]): void {}
}

describe('Linking consultations to session pages', () => {
  it('attaches the parliament period and session id when a council meeting has a session page', () => {
    const linked = generateConsultations().find((consultation) => consultation.agendaItem === '5.1')!;
    assertEquals(linked.parliamentPeriodId, PARLIAMENT_PERIOD_ID);
    assertEquals(linked.sessionId, SESSION_DATE);
  });

  it('leaves council consultations without a matching session page unlinked', () => {
    const unlinked = generateConsultations().find((consultation) => consultation.agendaItem === '5.2')!;
    assertEquals(unlinked.parliamentPeriodId, undefined);
    assertEquals(unlinked.sessionId, undefined);
  });

  it('does not link non-council meetings that merely share a session date', () => {
    const mayorConsultation = generateConsultations().find((consultation) => consultation.agendaItem === '5.3')!;
    assertEquals(mayorConsultation.parliamentPeriodId, undefined);
    assertEquals(mayorConsultation.sessionId, undefined);
  });

  function generateConsultations(): PaperConsultationDto[] {
    const writer = new CapturingPaperAssetsWriter();
    const generator = new PaperAssetsGenerator(
      new MockPaperFilesStore(),
      new MockOparlObjectsStore(),
      new MockSessionIndexStore({
        [SESSION_DATE]: { parliamentPeriodId: PARLIAMENT_PERIOD_ID, sessionId: SESSION_DATE },
      }),
      COUNCIL_ORGANIZATION,
      writer,
      new NoopPaperGraphAssetsWriter(),
    );
    generator.generatePaperAssets();
    return writer.consultations;
  }
});
