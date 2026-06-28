import { assertEquals } from '@std/assert';
import type {
  OparlAgendaItem,
  OparlConsultation,
  OparlFile,
  OparlMeeting,
  OparlOrganization,
  OparlPaper,
} from '@srw-astro/models/oparl';
import { OparlObjectsStore } from '../shared/oparl/oparl-objects-store.ts';
import { COUNCIL_ORGANIZATION_ID, OparlCouncilAssetsGenerator } from './oparl-council-assets-generator.ts';
import { OparlCouncilAssetsWriter } from './oparl-council-assets-writer.ts';
import { CouncilOparlAssets } from './model.ts';

const OTHER_ORGANIZATION_ID = 'https://ratsinfo.magdeburg.de/oparl/bodies/0001/organizations/gr/99';

class FakeOparlObjectsStore implements OparlObjectsStore {
  constructor(
    private readonly data: {
      meetings?: OparlMeeting[];
      agendaItems?: OparlAgendaItem[];
      consultations?: OparlConsultation[];
      papers?: OparlPaper[];
    },
  ) {}

  loadMeetings(): OparlMeeting[] {
    return this.data.meetings ?? [];
  }
  loadAgendaItems(): OparlAgendaItem[] {
    return this.data.agendaItems ?? [];
  }
  loadConsultations(): OparlConsultation[] {
    return this.data.consultations ?? [];
  }
  loadPapers(): OparlPaper[] {
    return this.data.papers ?? [];
  }
  loadFiles(): OparlFile[] {
    return [];
  }
  loadOrganizations(): OparlOrganization[] {
    return [];
  }
}

class CapturingWriter implements OparlCouncilAssetsWriter {
  public written: CouncilOparlAssets | null = null;
  write(assets: CouncilOparlAssets): void {
    this.written = assets;
  }
}

const councilMeeting: OparlMeeting = {
  id: 'meetings/1',
  type: 'https://schema.oparl.org/1.1/Meeting',
  name: 'Stadtrat',
  organization: [COUNCIL_ORGANIZATION_ID],
  start: '2024-05-01T14:00:00+02:00',
};

const otherMeeting: OparlMeeting = {
  id: 'meetings/2',
  type: 'https://schema.oparl.org/1.1/Meeting',
  name: 'Ausschuss',
  organization: [OTHER_ORGANIZATION_ID],
  start: '2024-05-02T14:00:00+02:00',
};

Deno.test('OparlCouncilAssetsGenerator', async (t) => {
  await t.step('keeps only meetings of the council organization', () => {
    const store = new FakeOparlObjectsStore({ meetings: [councilMeeting, otherMeeting] });
    const writer = new CapturingWriter();

    new OparlCouncilAssetsGenerator(store, writer).generate();

    assertEquals(writer.written?.meetings.map((m) => m.id), ['meetings/1']);
  });

  await t.step('keeps only agenda items belonging to council meetings', () => {
    const agendaItems: OparlAgendaItem[] = [
      { id: 'agenda/1', type: 'AgendaItem', name: 'A1', order: 1, meeting: 'meetings/1' },
      { id: 'agenda/2', type: 'AgendaItem', name: 'A2', order: 2, meeting: 'meetings/2' },
      { id: 'agenda/3', type: 'AgendaItem', name: 'A3', order: 3 },
    ];
    const store = new FakeOparlObjectsStore({ meetings: [councilMeeting, otherMeeting], agendaItems });
    const writer = new CapturingWriter();

    new OparlCouncilAssetsGenerator(store, writer).generate();

    assertEquals(writer.written?.agendaItems.map((a) => a.id), ['agenda/1']);
  });

  await t.step('keeps only consultations belonging to council meetings', () => {
    const consultations: OparlConsultation[] = [
      { id: 'cons/1', type: 'Consultation', name: 'C1', meeting: 'meetings/1' },
      { id: 'cons/2', type: 'Consultation', name: 'C2', meeting: 'meetings/2' },
      { id: 'cons/3', type: 'Consultation', name: 'C3' },
    ];
    const store = new FakeOparlObjectsStore({ meetings: [councilMeeting, otherMeeting], consultations });
    const writer = new CapturingWriter();

    new OparlCouncilAssetsGenerator(store, writer).generate();

    assertEquals(writer.written?.consultations.map((c) => c.id), ['cons/1']);
  });

  await t.step('papers index keeps only main papers with a date, as metadata', () => {
    const papers: OparlPaper[] = [
      {
        id: 'papers/100',
        type: 'Paper',
        name: 'Main paper',
        date: '2024-04-01',
        paperType: 'Antrag',
        reference: 'A0001/24',
      },
      // Has a subordinated paper → not a main paper.
      {
        id: 'papers/101',
        type: 'Paper',
        name: 'Child holder',
        date: '2024-04-02',
        subordinatedPaper: ['papers/100'],
      },
      // No date → excluded.
      { id: 'papers/102', type: 'Paper', name: 'Undated main' },
      // Deleted → excluded.
      { id: 'papers/103', type: 'Paper', name: 'Deleted', date: '2024-04-03', deleted: true },
    ];
    const store = new FakeOparlObjectsStore({ papers });
    const writer = new CapturingWriter();

    new OparlCouncilAssetsGenerator(store, writer).generate();

    assertEquals(writer.written?.papersIndex, [
      {
        id: 'papers/100',
        date: '2024-04-01',
        paperType: 'Antrag',
        reference: 'A0001/24',
        name: 'Main paper',
      },
    ]);
  });
});
