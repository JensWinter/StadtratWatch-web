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

    const generatedFilenames = this.writePaperVotingFiles(assets);
    this.removeStalePaperVotingsFiles(generatedFilenames);
  }

  private writePaperVotingFiles(assets: PaperVotingsAssetDto[]): Set<string> {
    const generatedFilenames = new Set<string>();
    for (const asset of assets) {
      const filename = `paper-votings-${asset.batchNo}.json`;
      generatedFilenames.add(filename);
      const filePath = path.join(this.paperVotingsDir, filename);
      Deno.writeTextFileSync(filePath, JSON.stringify(asset.paperVotings, null, 2));
    }
    return generatedFilenames;
  }

  private removeStalePaperVotingsFiles(generatedFilenames: Set<string>): void {
    for (const entry of Deno.readDirSync(this.paperVotingsDir)) {
      const isStalePaperVotingsFile = entry.isFile &&
        /^paper-votings-.*\.json$/.test(entry.name) &&
        !generatedFilenames.has(entry.name);
      if (isStalePaperVotingsFile) {
        Deno.removeSync(path.join(this.paperVotingsDir, entry.name));
      }
    }
  }
}
