import * as path from '@std/path';
import { CouncilOparlAssets } from './model.ts';

export interface OparlCouncilAssetsWriter {
  write(assets: CouncilOparlAssets): void;
}

export class OparlCouncilAssetsFileWriter implements OparlCouncilAssetsWriter {
  constructor(private readonly outputDir: string) {}

  write(assets: CouncilOparlAssets): void {
    Deno.mkdirSync(this.outputDir, { recursive: true });
    this.writeJson('meetings.json', assets.meetings);
    this.writeJson('agenda-items.json', assets.agendaItems);
    this.writeJson('consultations.json', assets.consultations);
    this.writeJson('papers-index.json', assets.papersIndex);
  }

  private writeJson(filename: string, data: unknown): void {
    const filepath = path.join(this.outputDir, filename);
    Deno.writeTextFileSync(filepath, JSON.stringify(data, null, 2));
  }
}
