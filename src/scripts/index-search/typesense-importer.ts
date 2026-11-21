export type IndexedPaper = {
  id: string;
  content: string[];

  paper_name: string;
  paper_type: string;
  paper_reference: string;
};

export type IndexedSpeech = {
  id: string;
  content: string[];

  speech_parliament_period: string;
  speech_session: string;
  speech_start: number;
  speech_session_date: number;
  speech_speaker: string;
  speech_faction: string | null;
  speech_party: string | null;
  speech_on_behalf_of: string | null;
};

type TypesenseDocument = {
  id: string;
  type: string;
  content: string[];

  paper_name: string;
  paper_type: string;
  paper_reference: string;

  speech_parliament_period: string;
  speech_session: string;
  speech_start: number;
  speech_session_date: number;
  speech_speaker: string;
  speech_faction: string | null;
  speech_party: string | null;
  speech_on_behalf_of: string | null;
};

export interface IDocumentsImporter {
  importPapers(papers: IndexedPaper[]): Promise<boolean>;
  importSpeeches(speeches: IndexedSpeech[]): Promise<boolean>;
}

export class TypesenseImporter implements IDocumentsImporter {
  constructor(
    private readonly typesenseServerUrl: string,
    private readonly typesenseCollectionName: string,
    private readonly typesenseApiKey: string,
  ) {}

  async importPapers(papers: IndexedPaper[]): Promise<boolean> {
    const data = papers.map<TypesenseDocument>((paper) => ({
      id: paper.id,
      type: 'paper',
      content: paper.content,

      paper_name: paper.paper_name,
      paper_type: paper.paper_type,
      paper_reference: paper.paper_reference,

      speech_parliament_period: '',
      speech_session: '',
      speech_start: 0,
      speech_session_date: 0,
      speech_speaker: '',
      speech_faction: null,
      speech_party: null,
      speech_on_behalf_of: null,
    }));

    return await this.importDocuments(data);
  }

  async importSpeeches(speeches: IndexedSpeech[]): Promise<boolean> {
    const data = speeches.map<TypesenseDocument>((speech) => ({
      id: speech.id,
      type: 'speech',
      content: speech.content,

      paper_name: '',
      paper_type: '',
      paper_reference: '',

      speech_parliament_period: speech.speech_parliament_period,
      speech_session: speech.speech_session,
      speech_start: speech.speech_start,
      speech_session_date: speech.speech_session_date,
      speech_speaker: speech.speech_speaker,
      speech_faction: speech.speech_faction,
      speech_party: speech.speech_party,
      speech_on_behalf_of: speech.speech_on_behalf_of,
    }));

    return await this.importDocuments(data);
  }

  private async importDocuments(documents: TypesenseDocument[]): Promise<boolean> {
    const data = documents.map((document) => JSON.stringify(document)).join('\n');
    const queryParams = new URLSearchParams({ action: 'upsert' });
    const url = `${this.typesenseServerUrl}/collections/${this.typesenseCollectionName}/documents/import?${queryParams}`;
    const init: RequestInit = {
      method: 'POST',
      headers: {
        'X-TYPESENSE-API-KEY': this.typesenseApiKey,
        'Content-Type': 'text/plain',
      },
      body: data,
    };
    const response = await fetch(url, init);

    return response.status === 200;
  }
}
