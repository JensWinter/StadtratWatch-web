export interface ConfigName {
  name: string;
  faction: string;
  rowIndex: number;
  columnIndex: number;
}

export interface NamesColumn {
  left: number;
  top: number;
  width: number;
  testPixelXOffset: number;
  testPixelYOffset: number;
}

export interface SessionLayout {
  namesRowHeight: number;
  namesColumns: NamesColumn[];
}

export interface SessionConfig {
  youtubeUrl: string;
  layout: SessionLayout;
  names: ConfigName[];
}

export type Vote = 'J' | 'N' | 'E' | string;

export interface VotingVote {
  name: string;
  vote: Vote;
}

export interface VotingSubject {
  agendaItem: string;
  motionId: string;
  title: string;
  type: string;
  authors: string[];
}

export interface Voting {
  votingFilename: string;
  videoTimestamp: string;
  votes: VotingVote[];
  votingSubject: VotingSubject;
}

export interface Segment {
  start: number;
  duration: number;
}

export interface Speaker {
  speaker: string;
  segments: Segment[];
}

export interface Speech {
  speaker: string;
  start: number;
  duration: number;
  isChairPerson?: boolean;
  onBehalfOf?: string;
}