import * as path from 'node:path';

import type { PaperIndex, PaperReferenceMap } from '@srw-astro/models/oparl-derivatives';

export interface DerivativesWriter {
  writePaperIndex(paperIndex: PaperIndex): Promise<void>;
  writePaperReferenceMap(paperReferenceMap: PaperReferenceMap): Promise<void>;
}

export class DerivativesFileWriter implements DerivativesWriter {
  constructor(private readonly dataDir: string) {}

  public async writePaperIndex(paperIndex: PaperIndex): Promise<void> {
    await writeJsonFile(path.join(this.dataDir, 'paper-index.json'), paperIndex);
  }

  public async writePaperReferenceMap(paperReferenceMap: PaperReferenceMap): Promise<void> {
    await writeJsonFile(path.join(this.dataDir, 'paper-reference-map.json'), paperReferenceMap);
  }
}

async function writeJsonFile(filename: string, data: unknown): Promise<void> {
  // Trailing newline keeps the committed derivate diffs clean.
  await Bun.write(filename, `${JSON.stringify(data, null, 2)}\n`);
}
