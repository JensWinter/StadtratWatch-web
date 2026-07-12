// Canonical types for the precompiled OParl derivates. Kept import-free so the
// Deno workspace can reexport them without pulling in Zod; the matching runtime
// schemas live in the Astro-only sibling oparl-derivatives.schema.ts.

// sessionDate -> agendaItemNumber -> numeric paper id (the value the former getPaperId join produced).
export type VotingPaperMap = {
  [sessionDate: string]: { [agendaItemNumber: string]: number };
};

export type PaperIndexEntry = {
  oparlId: string;
  id: string; // numeric suffix of oparlId
  date: string;
  paperType?: string;
  reference?: string;
  name: string;
};

export type PaperIndex = PaperIndexEntry[];
