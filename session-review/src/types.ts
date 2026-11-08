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