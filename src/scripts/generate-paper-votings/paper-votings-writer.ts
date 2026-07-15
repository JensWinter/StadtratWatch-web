import * as path from '@std/path';
import { PaperVotingsAssetDto } from './model.ts';

export interface PaperVotingsWriter {
  writePaperVotings(assets: PaperVotingsAssetDto[]): void;
}

export class PaperVotingsFileWriter implements PaperVotingsWriter {
  constructor(private readonly paperVotingsDir: string) {
  }

  writePaperVotings(assets: PaperVotingsAssetDto[]): void {
    Deno.mkdirSync(this.paperVotingsDir, { recursive: true });

    for (const asset of assets) {
      const filename = path.join(this.paperVotingsDir, `paper-votings-${asset.batchNo}.json`);
      Deno.writeTextFileSync(filename, JSON.stringify(asset.paperVotings, null, 2));
    }
  }
}
