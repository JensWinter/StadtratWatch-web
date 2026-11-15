import type { OparlMeeting, OparlPaper } from '@srw-astro/models/oparl';
import type {
  PaperIndex,
  PaperIndexEntry,
  PaperReferenceMap,
  VotingPaperMap,
} from '@srw-astro/models/oparl-derivatives';
import type { Registry } from '@srw-astro/models/registry';

import {
  OparlAgendaItemsInMemoryRepository,
  type OparlAgendaItemsRepository,
} from '../shared/oparl/oparl-agenda-items-repository.ts';
import {
  OparlConsultationsInMemoryRepository,
  type OparlConsultationsRepository,
} from '../shared/oparl/oparl-consultations-repository.ts';
import {
  OparlMeetingsInMemoryRepository,
  type OparlMeetingsRepository,
} from '../shared/oparl/oparl-meetings-repository.ts';
import type { OparlObjectsStore } from '../shared/oparl/oparl-objects-store.ts';
import { OparlPapersInMemoryRepository, type OparlPapersRepository } from '../shared/oparl/oparl-papers-repository.ts';
import type { DerivativesWriter } from './derivatives-writer.ts';
import type { RegistryStore } from './registry-store.ts';

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

  public async generate(): Promise<void> {
    const councilMeetingsByDate = this.indexCouncilMeetingsByDate();

    for (const registry of await this.registryStore.loadRegistries()) {
      console.log(`Generating voting-paper-map for period ${registry.id}`);
      const votingPaperMap = this.buildVotingPaperMap(registry, councilMeetingsByDate);
      await this.writer.writeVotingPaperMap(registry.id, votingPaperMap);
    }

    console.log('Generating global paper-index');
    await this.writer.writePaperIndex(this.buildPaperIndex());

    console.log('Generating global paper-reference-map');
    await this.writer.writePaperReferenceMap(this.buildPaperReferenceMap());
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

  private buildVotingPaperMap(registry: Registry, councilMeetingsByDate: Map<string, OparlMeeting>): VotingPaperMap {
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

      const paperId = numericPaperId(consultation.paper);
      if (paperId === null) {
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
