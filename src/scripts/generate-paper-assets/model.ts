export type PaperFileDto = {
  id: number;
  name: string;
  url: string;
  size: number | null;
};

export type PaperConsultationDto = {
  meeting: string;
  date: string | null;
  role: string | null;
  organization: string;
  agendaItem: string | null;
  result: string | null;
  parliamentPeriodId?: string;
  sessionId?: string;
};

export type PaperDto = {
  id: number;
  reference: string | null;
  type: string | null;
  title: string;
  files: PaperFileDto[];
  consultations: PaperConsultationDto[];
  rootPaperId: number;
};

export type PaperAssetDto = {
  batchNo: string;
  papers: PaperDto[];
};

export type PaperGraphDto = {
  rootPaperId: number;
  papers: PaperDto[];
};

export type PaperGraphAssetDto = {
  batchNo: string;
  paperGraphs: PaperGraphDto[];
};
