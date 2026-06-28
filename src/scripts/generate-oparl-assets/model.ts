import type { OparlAgendaItem, OparlConsultation, OparlMeeting } from '@srw-astro/models/oparl';
import type { PaperIndexItem } from '@srw-astro/models/oparl-prepared';

/**
 * The precompiled, council-scoped slice of OParl data written to
 * `data/oparl-council/` and consumed by the Astro content collections.
 */
export type CouncilOparlAssets = {
  meetings: OparlMeeting[];
  agendaItems: OparlAgendaItem[];
  consultations: OparlConsultation[];
  papersIndex: PaperIndexItem[];
};
