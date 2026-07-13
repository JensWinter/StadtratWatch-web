import { OparlObjectsStore } from '../shared/oparl/oparl-objects-store.ts';
import { OparlMeetingsInMemoryRepository, OparlMeetingsRepository } from '../shared/oparl/oparl-meetings-repository.ts';
import {
  OparlAgendaItemsInMemoryRepository,
  OparlAgendaItemsRepository,
} from '../shared/oparl/oparl-agenda-items-repository.ts';
import {
  OparlConsultationsInMemoryRepository,
  OparlConsultationsRepository,
} from '../shared/oparl/oparl-consultations-repository.ts';
import { OparlPapersInMemoryRepository, OparlPapersRepository } from '../shared/oparl/oparl-papers-repository.ts';
import { PaperIndex, PaperIndexEntry, VotingPaperMap } from '@srw-astro/models/oparl-derivatives';
import { OparlMeeting } from '@srw-astro/models/oparl';
import { Registry } from '@srw-astro/models/registry';
import { RegistryStore } from './registry-store.ts';
import { DerivativesWriter } from './derivatives-writer.ts';

export class OparlDerivativesGenerator {
  private readonly meetingsRepository: OparlMeetingsRepository;
  private readonly agendaItemsRepository: OparlAgendaItemsRepository;
  private readonly consultationsRepository: OparlConsultationsRepository;
  private readonly papersRepository: OparlPapersRepository;

  constructor(
    private readonly oparlObjectsStore: OparlObjectsStore,
    private readonly registryStore: RegistryStore,
    private readonly writer: DerivativesWriter,
    private readonly councilOrganizationId: string,
  ) {
    this.meetingsRepository = new OparlMeetingsInMemoryRepository(this.oparlObjectsStore.loadMeetings());
    this.agendaItemsRepository = new OparlAgendaItemsInMemoryRepository(this.oparlObjectsStore.loadAgendaItems());
    this.consultationsRepository = new OparlConsultationsInMemoryRepository(this.oparlObjectsStore.loadConsultations());
    this.papersRepository = new OparlPapersInMemoryRepository(this.oparlObjectsStore.loadPapers());
  }

  public generate(): void {
    const councilMeetingsByDate = this.indexCouncilMeetingsByDate();

    for (const { periodId, registry } of this.registryStore.loadRegistries()) {
      console.log(`Generating voting-paper-map for period ${periodId}`);
      const votingPaperMap = this.buildVotingPaperMap(registry, councilMeetingsByDate);
      this.writer.writeVotingPaperMap(periodId, votingPaperMap);
    }

    console.log('Generating global paper-index');
    this.writer.writePaperIndex(this.buildPaperIndex());
  }

  private indexCouncilMeetingsByDate(): Map<string, OparlMeeting> {
    // File order is preserved so the first council meeting per date wins,
    // mirroring the former getPaperId `meetings.find()`.
    const councilMeetings = this.meetingsRepository
      .getMeetingsByOrganization(this.councilOrganizationId)
      .filter((meeting) => !!meeting.start);

    const meetingsByDate = new Map<string, OparlMeeting>();
    for (const meeting of councilMeetings) {
      const date = meeting.start!.slice(0, 10);
      const existing = meetingsByDate.get(date);
      if (existing) {
        console.warn(`Multiple council meetings on ${date}; keeping ${existing.id}, ignoring ${meeting.id}`);
        continue;
      }
      meetingsByDate.set(date, meeting);
    }

    return meetingsByDate;
  }

  private buildVotingPaperMap(
    registry: Registry,
    councilMeetingsByDate: Map<string, OparlMeeting>,
  ): VotingPaperMap {
    const votingPaperMap: VotingPaperMap = {};

    const sessions = registry.sessions.toSorted((a, b) => a.date.localeCompare(b.date));
    for (const session of sessions) {
      const meeting = councilMeetingsByDate.get(session.date);
      if (!meeting) {
        console.warn(`No OParl council meeting found for session ${session.date} (period ${registry.id})`);
        continue;
      }

      const agendaItemMap = this.buildAgendaItemPaperMap(meeting.id);
      if (Object.keys(agendaItemMap).length > 0) {
        votingPaperMap[session.date] = agendaItemMap;
      }
    }

    return votingPaperMap;
  }

  private buildAgendaItemPaperMap(meetingId: string): VotingPaperMap[string] {
    const paperIdByAgendaItemNumber: VotingPaperMap[string] = {};
    const seenNumbers = new Set<string>();

    // File order is preserved so the first agenda item per number wins,
    // mirroring the former getPaperId `agendaItems.find()`.
    const agendaItems = this.agendaItemsRepository.getAgendaItemsByMeeting(meetingId);

    for (const agendaItem of agendaItems) {
      if (!agendaItem.number) {
        continue;
      }
      if (seenNumbers.has(agendaItem.number)) {
        continue;
      }
      seenNumbers.add(agendaItem.number);

      if (!agendaItem.consultation) {
        continue;
      }
      const consultation = this.consultationsRepository.getConsultationById(agendaItem.consultation);
      if (!consultation?.paper) {
        continue;
      }

      const paperId = Number(oparlIdSuffix(consultation.paper));
      if (Number.isNaN(paperId)) {
        console.warn(`Skipping non-numeric paper id derived from ${consultation.paper}`);
        continue;
      }
      paperIdByAgendaItemNumber[agendaItem.number] = paperId;
    }

    return paperIdByAgendaItemNumber;
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
}

function oparlIdSuffix(oparlId: string): string {
  return oparlId.split('/').pop()!;
}
