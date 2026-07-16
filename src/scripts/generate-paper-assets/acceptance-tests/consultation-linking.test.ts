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

const MEETING_WITH_SESSION_PAGE = 'http://example.com/oparl/meetings/1';
const MEETING_WITHOUT_SESSION_PAGE = 'http://example.com/oparl/meetings/2';
const ORGANIZATION = 'http://example.com/oparl/organizations/1';
const AGENDA_ITEM_LINKED = 'http://example.com/oparl/agendaItems/1';
const AGENDA_ITEM_UNLINKED = 'http://example.com/oparl/agendaItems/2';

const SESSION_DATE = '2024-07-08';
const PARLIAMENT_PERIOD_ID = 'magdeburg-8';

class MockPaperFilesStore implements PaperFilesStore {
  getFileSize = (_fileId: number): number | null => null;
}

class MockOparlObjectsStore implements OparlObjectsStore {
  loadAgendaItems = (): OparlAgendaItem[] => [
    this.agendaItem(AGENDA_ITEM_LINKED, '5.1'),
    this.agendaItem(AGENDA_ITEM_UNLINKED, '5.2'),
  ];

  loadConsultations = (): OparlConsultation[] => [];

  loadFiles = (): OparlFile[] => [];

  loadMeetings = (): OparlMeeting[] => [
    this.meeting(MEETING_WITH_SESSION_PAGE, `${SESSION_DATE}T15:00:00+02:00`),
    this.meeting(MEETING_WITHOUT_SESSION_PAGE, '2024-06-03T15:00:00+02:00'),
  ];

  loadOrganizations = (): OparlOrganization[] => [
    { id: ORGANIZATION, type: 'https://schema.oparl.org/1.1/Organization', name: 'Stadtrat' },
  ];

  loadPapers = (): OparlPaper[] => [
    {
      id: 'http://example.com/oparl/papers/1',
      type: 'https://schema.oparl.org/1.1/Paper',
      name: 'Paper 1',
      consultation: [
        this.consultation(MEETING_WITH_SESSION_PAGE, AGENDA_ITEM_LINKED),
        this.consultation(MEETING_WITHOUT_SESSION_PAGE, AGENDA_ITEM_UNLINKED),
      ],
    },
  ];

  private meeting(id: string, start: string): OparlMeeting {
    return { id, type: 'https://schema.oparl.org/1.1/Meeting', name: 'Sitzung', start };
  }

  private agendaItem(id: string, number: string): OparlAgendaItem {
    return { id, type: 'https://schema.oparl.org/1.1/AgendaItem', name: 'TOP', order: 0, number };
  }

  private consultation(meeting: string, agendaItem: string): OparlConsultation {
    return {
      id: `${meeting}-consultation`,
      type: 'https://schema.oparl.org/1.1/Consultation',
      name: 'Beratung',
      meeting,
      organization: [ORGANIZATION],
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
  it('attaches the parliament period and session id when the meeting date has a session page', () => {
    const consultations = generateConsultations({
      [SESSION_DATE]: { parliamentPeriodId: PARLIAMENT_PERIOD_ID, sessionId: SESSION_DATE },
    });

    const linked = consultations.find((consultation) => consultation.agendaItem === '5.1')!;
    assertEquals(linked.parliamentPeriodId, PARLIAMENT_PERIOD_ID);
    assertEquals(linked.sessionId, SESSION_DATE);
  });

  it('leaves consultations without a matching session page unlinked', () => {
    const consultations = generateConsultations({
      [SESSION_DATE]: { parliamentPeriodId: PARLIAMENT_PERIOD_ID, sessionId: SESSION_DATE },
    });

    const unlinked = consultations.find((consultation) => consultation.agendaItem === '5.2')!;
    assertEquals(unlinked.parliamentPeriodId, undefined);
    assertEquals(unlinked.sessionId, undefined);
  });

  function generateConsultations(sessionIndex: SessionIndex): PaperConsultationDto[] {
    const writer = new CapturingPaperAssetsWriter();
    const generator = new PaperAssetsGenerator(
      new MockPaperFilesStore(),
      new MockOparlObjectsStore(),
      new MockSessionIndexStore(sessionIndex),
      writer,
      new NoopPaperGraphAssetsWriter(),
    );
    generator.generatePaperAssets();
    return writer.consultations;
  }
});
