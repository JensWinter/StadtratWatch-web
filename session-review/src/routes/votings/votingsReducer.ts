import { produce } from 'immer';
import type { MajorityRequirement, SessionScanItem } from '@srw-astro/models/session-scan';

export interface VotingsState {
  votings: SessionScanItem[];
  selectedIndex: number;
}

export type VotingsAction =
  | { type: 'init'; votings: SessionScanItem[] }
  | { type: 'select'; index: number }
  | { type: 'setTimestamp'; value: string }
  | { type: 'setAgendaItem'; value: string }
  | { type: 'setMotionId'; value: string }
  | { type: 'setTitle'; value: string }
  | { type: 'setType'; value: string }
  | { type: 'toggleAuthor'; author: string }
  | { type: 'setMajorityRequirement'; value: MajorityRequirement | undefined }
  | { type: 'setPresentMembers'; value: number | undefined };

export const initialVotingsState: VotingsState = { votings: [], selectedIndex: -1 };

export const votingsReducer = produce(
  (draft: VotingsState, action: VotingsAction) => {
    const current = draft.votings[draft.selectedIndex];
    switch (action.type) {
      case 'init':
        draft.votings = action.votings;
        draft.selectedIndex = action.votings.length > 0 ? 0 : -1;
        break;
      case 'select':
        draft.selectedIndex = action.index;
        break;
      case 'setTimestamp':
        if (current) current.videoTimestamp = action.value;
        break;
      case 'setAgendaItem':
        if (current) current.votingSubject.agendaItem = action.value;
        break;
      case 'setMotionId':
        if (current) current.votingSubject.motionId = action.value;
        break;
      case 'setTitle':
        if (current) current.votingSubject.title = action.value;
        break;
      case 'setType':
        if (current) current.votingSubject.type = action.value;
        break;
      case 'toggleAuthor': {
        if (!current) break;
        const authors = current.votingSubject.authors;
        const at = authors.indexOf(action.author);
        if (at === -1) authors.push(action.author);
        else authors.splice(at, 1);
        break;
      }
      case 'setMajorityRequirement':
        if (!current) break;
        if (action.value === undefined) delete current.majorityRequirement;
        else current.majorityRequirement = action.value;
        break;
      case 'setPresentMembers':
        if (!current) break;
        if (action.value === undefined) delete current.presentMembers;
        else current.presentMembers = action.value;
        break;
    }
  },
);
