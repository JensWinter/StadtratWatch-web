import * as fs from '@std/fs';
import * as path from '@std/path';
import { decodeBase64 } from '@std/encoding';
import { Canvas } from '@gfx/canvas';
import { type GeneratedPartyImage, type GeneratedVotingImage } from './images-generator.ts';

export class ImageAssetsWriter {
  private readonly votingsImagesOutputDir: string;
  private readonly partiesImagesOutputDir: string;

  constructor(private readonly outputDir: string) {
    this.votingsImagesOutputDir = path.join(this.outputDir, 'images', 'votings');
    this.partiesImagesOutputDir = path.join(this.outputDir, 'images', 'parties');
    this.ensureOutputDirsExists();
  }

  public writeImageAssets(votingImages: GeneratedVotingImage[], partyImages: GeneratedPartyImage[]) {
    this.writeVotingImagesFiles(votingImages);
    this.writePartyImagesFiles(partyImages);
  }

  private writeVotingImagesFiles(votingImages: GeneratedVotingImage[]) {
    console.log('Writing votings images...');

    votingImages.forEach((votingImage) => {
      const { sessionId, votingId, canvas } = votingImage;

      const sessionOutputDir = path.join(this.votingsImagesOutputDir, sessionId);
      fs.ensureDirSync(sessionOutputDir);

      const filename = `${sessionId}-${votingId.toString().padStart(3, '0')}.png`;
      this.writePngFile(canvas, path.join(sessionOutputDir, filename));
    });
  }

  private writePartyImagesFiles(partyImages: GeneratedPartyImage[]) {
    console.log('Writing party images...');

    partyImages.forEach(({ partyId, canvas }) =>
      this.writePngFile(canvas, path.join(this.partiesImagesOutputDir, `${partyId}.png`))
    );
  }

  private writePngFile(canvas: Canvas, filename: string) {
    const imageBase64Encoded = canvas.toDataURL().replace(/^data:image\/png;base64,/, '');
    Deno.writeFileSync(filename, decodeBase64(imageBase64Encoded));
  }

  private ensureOutputDirsExists() {
    fs.ensureDirSync(this.outputDir);
    fs.ensureDirSync(this.votingsImagesOutputDir);
    fs.ensureDirSync(this.partiesImagesOutputDir);
  }
}
