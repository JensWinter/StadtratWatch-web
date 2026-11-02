import type { VoteCode } from '@srw-astro/models/session';
import type { SessionScanVote } from '@srw-astro/models/session-scan';

import type { ScanConfig, ScanConfigLayout, ScanConfigPerson } from './scan-config.ts';
import type { IVotingImagesSource, PixelMatrix } from './voting-images-source.ts';

type CategorizedColor = 'red' | 'green' | 'yellow' | 'white' | 'unknown';

export interface IVotesRecognizer {
  getVotesForNames(votingFilepath: string, config: ScanConfig): SessionScanVote[];
}

export class VotesRecognizer implements IVotesRecognizer {
  constructor(private readonly imagesSource: IVotingImagesSource) {}

  public getVotesForNames(votingFilepath: string, config: ScanConfig): SessionScanVote[] {
    const image = this.imagesSource.loadVotingImage(votingFilepath);
    return config.names.map((name) => this.getVoteForName(image, name, config.layout));
  }

  private getVoteForName(image: PixelMatrix, name: ScanConfigPerson, layout: ScanConfigLayout): SessionScanVote {
    const position = this.getTestPositionForName(name, layout);
    const color = this.getColorAtPosition(image, position.x, position.y);
    const categorizedColor = this.categorizeColor(color);
    const vote = this.categoryToVote(categorizedColor);

    return { name: name.name, vote };
  }

  private getTestPositionForName(name: ScanConfigPerson, layout: ScanConfigLayout) {
    const nameColumn = layout.namesColumns[name.columnIndex];
    return {
      x: nameColumn.left + nameColumn.testPixelXOffset,
      y: nameColumn.top + nameColumn.testPixelYOffset + name.rowIndex * layout.namesRowHeight,
    };
  }

  private getColorAtPosition(image: PixelMatrix, centerX: number, centerY: number): number[] {
    const channelSums = [0, 0, 0];
    for (let y = centerY - 1; y <= centerY + 1; y++) {
      for (let x = centerX - 1; x <= centerX + 1; x++) {
        const pixelOffset = (y * image.width + x) * image.channels;
        for (let channel = 0; channel < 3; channel++) {
          channelSums[channel] += image.data[pixelOffset + channel];
        }
      }
    }

    return channelSums.map((sum) => Math.round(sum / 9));
  }

  private categorizeColor(color: number[]): CategorizedColor {
    const [r, g, b] = color;

    if (r > 90 && g > 90 && b > 90 && Math.abs(r - g) < 10 && Math.abs(r - b) < 10 && Math.abs(g - b) < 10) {
      return 'white';
    }

    if (r > 80 && g > 80 && b < 80 && Math.abs(r - g) < 35) {
      return 'yellow';
    }

    if (g > r && g > b) {
      return 'green';
    }

    if (r > g && r > b) {
      return 'red';
    }

    return 'unknown';
  }

  private categoryToVote(category: CategorizedColor): VoteCode {
    switch (category) {
      case 'red':
        return 'N';
      case 'green':
        return 'J';
      case 'yellow':
        return 'E';
      case 'white':
        return 'O';
      default:
        return 'O';
    }
  }
}
