import * as path from '@std/path';
import { PaperIndex, VotingPaperMap } from '@srw-astro/models/oparl-derivatives';

export interface DerivativesWriter {
  writeVotingPaperMap(periodId: string, votingPaperMap: VotingPaperMap): void;
  writePaperIndex(paperIndex: PaperIndex): void;
}

export class DerivativesFileWriter implements DerivativesWriter {
  constructor(private readonly dataDir: string) {
  }

  public writeVotingPaperMap(periodId: string, votingPaperMap: VotingPaperMap): void {
    const filename = path.join(this.dataDir, periodId, 'voting-paper-map.json');
    writeJsonFile(filename, votingPaperMap);
  }

  public writePaperIndex(paperIndex: PaperIndex): void {
    const filename = path.join(this.dataDir, 'paper-index.json');
    writeJsonFile(filename, paperIndex);
  }
}

function writeJsonFile(filename: string, data: unknown): void {
  // Trailing newline keeps the committed derivate diffs clean.
  Deno.writeTextFileSync(filename, `${JSON.stringify(data, null, 2)}\n`);
}
