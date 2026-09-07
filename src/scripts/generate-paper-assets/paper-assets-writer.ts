import * as path from '@std/path';
import { PaperAssetDto } from './model.ts';

export interface PaperAssetsWriter {
  writePaperAssets(papers: PaperAssetDto[]): void;
}

export class PaperAssetsFileWriter implements PaperAssetsWriter {
  constructor(private readonly paperAssetsDir: string) {
  }

  writePaperAssets(assets: PaperAssetDto[]): void {
    Deno.mkdirSync(this.paperAssetsDir, { recursive: true });

    const generatedFilenames = this.writePaperAssetFiles(assets);
    this.removeStalePaperAssetFiles(generatedFilenames);
  }

  private writePaperAssetFiles(assets: PaperAssetDto[]): Set<string> {
    const generatedFilenames = new Set<string>();
    for (const asset of assets) {
      const filename = `papers-${asset.batchNo}.json`;
      generatedFilenames.add(filename);
      const filePath = path.join(this.paperAssetsDir, filename);
      Deno.writeTextFileSync(filePath, JSON.stringify(asset.papers, null, 2));
    }
    return generatedFilenames;
  }

  private removeStalePaperAssetFiles(generatedFilenames: Set<string>): void {
    for (const entry of Deno.readDirSync(this.paperAssetsDir)) {
      const isStalePaperAssetFile = entry.isFile &&
        /^papers-.*\.json$/.test(entry.name) &&
        !generatedFilenames.has(entry.name);
      if (isStalePaperAssetFile) {
        Deno.removeSync(path.join(this.paperAssetsDir, entry.name));
      }
    }
  }
}
