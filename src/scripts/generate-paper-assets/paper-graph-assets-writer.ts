import * as path from '@std/path';
import { PaperGraphAssetDto } from './model.ts';

export interface PaperGraphAssetsWriter {
  writePaperGraphAssets(assets: PaperGraphAssetDto[]): void;
}

export class PaperGraphAssetsFileWriter implements PaperGraphAssetsWriter {
  constructor(private readonly paperAssetsDir: string) {
  }

  writePaperGraphAssets(assets: PaperGraphAssetDto[]): void {
    Deno.mkdirSync(this.paperAssetsDir, { recursive: true });

    const generatedFilenames = this.writePaperGraphAssetFiles(assets);
    this.removeStalePaperGraphAssetFiles(generatedFilenames);
  }

  private writePaperGraphAssetFiles(assets: PaperGraphAssetDto[]): Set<string> {
    const generatedFilenames = new Set<string>();
    for (const asset of assets) {
      const filename = `paper-graphs-${asset.batchNo}.json`;
      generatedFilenames.add(filename);
      const filePath = path.join(this.paperAssetsDir, filename);
      Deno.writeTextFileSync(filePath, JSON.stringify(asset.paperGraphs, null, 2));
    }
    return generatedFilenames;
  }

  private removeStalePaperGraphAssetFiles(generatedFilenames: Set<string>): void {
    for (const entry of Deno.readDirSync(this.paperAssetsDir)) {
      const isStalePaperGraphAssetFile = entry.isFile &&
        /^paper-graphs-.*\.json$/.test(entry.name) &&
        !generatedFilenames.has(entry.name);
      if (isStalePaperGraphAssetFile) {
        Deno.removeSync(path.join(this.paperAssetsDir, entry.name));
      }
    }
  }
}
