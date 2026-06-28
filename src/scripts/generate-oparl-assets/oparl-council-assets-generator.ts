import type { OparlPaper } from '@srw-astro/models/oparl';
import type { PaperIndexItem } from '@srw-astro/models/oparl-prepared';
import { OparlMeetingsInMemoryRepository } from '../shared/oparl/oparl-meetings-repository.ts';
import { OparlObjectsStore } from '../shared/oparl/oparl-objects-store.ts';
import { CouncilOparlAssets } from './model.ts';
import { OparlCouncilAssetsWriter } from './oparl-council-assets-writer.ts';

/**
 * The city council organization ("Stadtrat") in the Magdeburg OParl system.
 * Only meetings of this organization (and their agenda items / consultations)
 * are relevant to the site, so the precompile step filters everything down to
 * it. Previously this id was hardcoded in the Astro build
 * (pp/[parliamentPeriodId]/_helpers.ts).
 */
export const COUNCIL_ORGANIZATION_ID = 'https://ratsinfo.magdeburg.de/oparl/bodies/0001/organizations/gr/1';

export class OparlCouncilAssetsGenerator {
  constructor(
    private readonly oparlObjectsStore: OparlObjectsStore,
    private readonly writer: OparlCouncilAssetsWriter,
  ) {}

  public generate(): void {
    this.writer.write(this.buildAssets());
  }

  public buildAssets(): CouncilOparlAssets {
    const meetingsRepository = new OparlMeetingsInMemoryRepository(this.oparlObjectsStore.loadMeetings());
    const meetings = meetingsRepository.getMeetingsByOrganization(COUNCIL_ORGANIZATION_ID);
    const meetingIds = new Set(meetings.map((meeting) => meeting.id));

    const agendaItems = this.oparlObjectsStore
      .loadAgendaItems()
      .filter((agendaItem) => agendaItem.meeting !== undefined && meetingIds.has(agendaItem.meeting));

    const consultations = this.oparlObjectsStore
      .loadConsultations()
      .filter((consultation) => consultation.meeting !== undefined && meetingIds.has(consultation.meeting));

    const papersIndex = this.buildPapersIndex(this.oparlObjectsStore.loadPapers());

    return { meetings, agendaItems, consultations, papersIndex };
  }

  /**
   * A metadata-only index of main (root) papers. Mirrors the "main paper"
   * predicate of the former build-time `getRecentMainPapers` (no subordinated
   * paper, has a date). The rolling date window stays in the Astro page so the
   * "recent papers" list refreshes per deploy.
   */
  private buildPapersIndex(papers: OparlPaper[]): PaperIndexItem[] {
    return papers
      .filter((paper) => !paper.deleted)
      .filter((paper) => (paper.subordinatedPaper || []).length === 0)
      .filter((paper) => !!paper.date)
      .map<PaperIndexItem>((paper) => ({
        id: paper.id,
        date: paper.date!,
        paperType: paper.paperType,
        reference: paper.reference,
        name: paper.name,
      }));
  }
}
