import { Canvas, CanvasRenderingContext2D, createCanvas } from '@gfx/canvas';
import type { Voting } from './model.ts';
import type { Registry, RegistryParty } from '@srw-astro/models/registry';

const TOTAL_WIDTH = 1200;
const TOTAL_HEIGHT = 630;
const COLUMN_WIDTH = 540;

const PADDING_LEFT = 40;
const PADDING_TOP = 40;
const PADDING_RIGHT = 40;
const PADDING_BOTTOM = 40;
const GAP = TOTAL_WIDTH - PADDING_LEFT - PADDING_RIGHT - 2 * COLUMN_WIDTH;

const BACKGROUND_COLOR = '#3C3C3C';
const VOTED_FOR_FILL_COLOR = '#4EA72E';
const VOTED_AGAINST_FILL_COLOR = '#ED5642';
const ABSTENTIONS_FILL_COLOR = '#DDDDDD';
const TEXT_COLOR = '#DDDDDD';
const TEXT_COLOR_DARK = '#3C3C3C';

export type GeneratedVotingImage = {
  sessionId: string;
  votingId: number;
  canvas: Canvas;
};

export type GeneratedPartyImage = {
  partyId: string;
  canvas: Canvas;
};

export class ImagesGenerator {
  public generateVotingImages(votings: Voting[]): GeneratedVotingImage[] {
    return votings.map((voting) => this.generateVotingImage(voting));
  }

  public generatePartyImages(registry: Registry): GeneratedPartyImage[] {
    return registry.parties.map((party) => this.generatePartyImage(party, registry.name));
  }

  private generateVotingImage(voting: Voting): GeneratedVotingImage {
    const canvas = createCanvas(TOTAL_WIDTH, TOTAL_HEIGHT);
    const context = canvas.getContext('2d');

    this.fillCanvas(context);

    const summaryCanvas = this.drawSummaryCanvas(voting);
    context.drawImage(summaryCanvas, PADDING_LEFT, PADDING_TOP);

    const votingDistributionCanvas = this.drawVotingDistributionCanvas(voting);
    context.drawImage(votingDistributionCanvas, PADDING_LEFT + summaryCanvas.width + GAP, PADDING_TOP);

    return { sessionId: voting.sessionId, votingId: voting.votingId, canvas };
  }

  private generatePartyImage(party: RegistryParty, parliamentPeriodName: string): GeneratedPartyImage {
    const canvas = createCanvas(TOTAL_WIDTH, TOTAL_HEIGHT);
    const context = canvas.getContext('2d');

    this.fillCanvas(context);

    context.fillStyle = TEXT_COLOR;
    context.font = '14pt Verdana';
    context.fillText('StadtratWatch', PADDING_LEFT, PADDING_TOP + 20);

    const contentWidth = TOTAL_WIDTH - PADDING_LEFT - PADDING_RIGHT;
    const verticalCenter = TOTAL_HEIGHT / 2;

    context.textAlign = 'center';
    context.font = `bold ${this.getLargestFittingFontSize(party.name, contentWidth)}pt Verdana`;
    context.fillText(party.name, TOTAL_WIDTH / 2, verticalCenter);

    context.font = '20pt Verdana';
    context.fillText('Magdeburger Stadtrat', TOTAL_WIDTH / 2, verticalCenter + 70);

    context.textAlign = 'left';
    context.font = '14pt Verdana';
    context.fillText(parliamentPeriodName, PADDING_LEFT, TOTAL_HEIGHT - PADDING_BOTTOM);

    return { partyId: party.id, canvas };
  }

  private getLargestFittingFontSize(text: string, maxWidth: number): number {
    const MAX_FONT_SIZE = 60;
    const MIN_FONT_SIZE = 24;

    const context = createCanvas(maxWidth, 100).getContext('2d');
    for (let fontSize = MAX_FONT_SIZE; fontSize > MIN_FONT_SIZE; fontSize -= 2) {
      context.font = `bold ${fontSize}pt Verdana`;
      if (context.measureText(text).width <= maxWidth) {
        return fontSize;
      }
    }
    return MIN_FONT_SIZE;
  }

  private fillCanvas(context: CanvasRenderingContext2D) {
    const MAIN_BORDER_WIDTH = 3;

    context.fillStyle = TEXT_COLOR;
    context.fillRect(0, 0, TOTAL_WIDTH, TOTAL_HEIGHT);

    context.beginPath();
    context.fillStyle = BACKGROUND_COLOR;
    // noinspection JSSuspiciousNameCombination
    context.roundRect(
      MAIN_BORDER_WIDTH,
      MAIN_BORDER_WIDTH,
      TOTAL_WIDTH - 2 * MAIN_BORDER_WIDTH,
      TOTAL_HEIGHT - 2 * MAIN_BORDER_WIDTH,
      8,
    );
    context.fill();
  }

  private drawSummaryCanvas(voting: Voting): Canvas {
    const canvasHeight = TOTAL_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
    const canvas = createCanvas(COLUMN_WIDTH, canvasHeight);
    const context = canvas.getContext('2d');

    const votingHeaderCanvas = this.writeVotingHeader(voting);
    context.drawImage(votingHeaderCanvas, 0, 0);

    const motionIdCanvas = this.writeMotionId(voting);
    if (motionIdCanvas) {
      context.drawImage(motionIdCanvas, 0, votingHeaderCanvas.height + 20);
    }

    const subjectLines = this.getWrappedLines(voting.subjectTitle, COLUMN_WIDTH);
    const subjectLinesCanvas = this.writeSubject(subjectLines);
    const motionIdYOffset = motionIdCanvas ? motionIdCanvas.height : 0;
    context.drawImage(subjectLinesCanvas, 0, votingHeaderCanvas.height + 20 + motionIdYOffset);

    const votingResultCanvas = this.drawVotingResult(voting);
    context.drawImage(votingResultCanvas, 0, canvasHeight - votingResultCanvas.height);

    return canvas;
  }

  private writeVotingHeader(voting: Voting): Canvas {
    const canvas = createCanvas(COLUMN_WIDTH, 30);
    const context = canvas.getContext('2d');

    context.font = '14pt Verdana';
    context.fillStyle = TEXT_COLOR;
    const formattedDate = new Date(voting.date).toLocaleDateString(
      'de-DE',
      { year: 'numeric', month: '2-digit', day: '2-digit' },
    );
    context.fillText(`Abstimmung am ${formattedDate}`, 0, 20);

    return canvas;
  }

  private writeMotionId(voting: Voting): Canvas | null {
    let text = '';
    switch (voting.motionType) {
      case 'Änderungsantrag':
        text = voting.motionId ? `Änderungsantrag ${voting.motionId}` : 'Änderungsantrag';
        break;

      case 'Antrag':
        text = voting.motionId ? `Antrag ${voting.motionId}` : 'Antrag';
        break;

      case 'Beschlussvorlage':
        text = voting.motionId ? `Beschlussvorlage ${voting.motionId}` : 'Beschlussvorlage';
        break;

      case 'Delegation':
        return null;

      case 'Geschäftsordnung':
        text = voting.motionId ? `Geschäftsordnungsantrag zu ${voting.motionId}` : 'Geschäftsordnungsantrag';
        break;

      case 'Niederschrift':
        return null;

      case 'Redaktionelle Änderung':
        text = voting.motionId ? `Redaktionelle Änderung zu ${voting.motionId}` : 'Redaktionelle Änderung';
        break;

      case 'Sonstige':
        return null;

      case 'Tagesordnung':
        text = `Abstimmung zur Tagesordnung`;
        break;
    }

    const canvas = createCanvas(COLUMN_WIDTH, 30);

    if (text.trim() !== '') {
      const context = canvas.getContext('2d');
      context.font = 'italic 14pt Verdana';
      context.fillStyle = TEXT_COLOR;
      context.fillText(text, 0, 20);
    }

    return canvas;
  }

  private writeSubject(lines: string[]): Canvas {
    const canvas = createCanvas(COLUMN_WIDTH, lines.length * 30);
    const context = canvas.getContext('2d');

    context.font = 'bold 18pt Verdana';
    context.fillStyle = TEXT_COLOR;

    lines.filter((line) => line.trim() !== '').forEach((line, index) => context.fillText(line, 0, index * 30 + 20));

    return canvas;
  }

  private drawVotingResult(voting: Voting) {
    const votedFor = voting.votes.reduce((sum, faction) => sum + faction.votesFor, 0);
    const votedAgainst = voting.votes.reduce((sum, faction) => sum + faction.votesAgainst, 0);
    const abstentions = voting.votes.reduce((sum, faction) => sum + faction.abstentions, 0);

    const canvas = createCanvas(COLUMN_WIDTH, 170);
    const context = canvas.getContext('2d');

    this.drawVotesSummary(context, votedFor, 'Dafür', 80, VOTED_FOR_FILL_COLOR);
    this.drawVotesSummary(context, votedAgainst, 'Dagegen', 270, VOTED_AGAINST_FILL_COLOR);
    this.drawVotesSummary(context, abstentions, 'Enthalten', 460, ABSTENTIONS_FILL_COLOR);

    if (votedFor > votedAgainst) {
      this.drawTotalVotingSummary(context, 'Angenommen', VOTED_FOR_FILL_COLOR);
    } else {
      this.drawTotalVotingSummary(context, 'Abgelehnt', VOTED_AGAINST_FILL_COLOR);
    }

    return canvas;
  }

  private drawVotesSummary(
    context: CanvasRenderingContext2D,
    votes: number,
    text: string,
    xCenter: number,
    fillColor: string,
  ) {
    const RECT_WIDTH = 160;
    const RECT_HEIGHT = 40;

    context.font = '14pt Verdana';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.fillText(text, xCenter, 20);

    context.beginPath();
    context.fillStyle = fillColor;
    context.roundRect(xCenter - RECT_WIDTH / 2, 35, RECT_WIDTH, RECT_HEIGHT, 5);
    context.fill();

    context.font = 'bold 18pt Verdana';
    context.fillStyle = TEXT_COLOR_DARK;
    context.textAlign = 'center';
    context.fillText(`${votes}`, xCenter, 65);
  }

  private drawTotalVotingSummary(context: CanvasRenderingContext2D, text: string, fillColor: string) {
    context.beginPath();
    context.fillStyle = fillColor;
    context.roundRect(0, 90, COLUMN_WIDTH, 80, 10);
    context.fill();

    context.font = 'bold 24pt Verdana';
    context.fillStyle = TEXT_COLOR_DARK;
    context.textAlign = 'center';
    context.fillText(text, COLUMN_WIDTH / 2, 140);
  }

  private drawVotingDistributionCanvas(voting: Voting): Canvas {
    const canvas = createCanvas(COLUMN_WIDTH, TOTAL_HEIGHT);
    const context = canvas.getContext('2d');

    context.font = '14pt Verdana';

    voting.votes.forEach((faction, index: number) => {
      context.fillStyle = TEXT_COLOR;
      context.fillText(faction.faction, 0, index * 70 + 20);

      const seats = faction.votesFor + faction.abstentions + faction.votesAgainst + faction.notVoted;

      for (let i = 1; i <= seats; i++) {
        context.beginPath();
        if (i > faction.votesFor + faction.abstentions + faction.votesAgainst) {
          context.fillStyle = 'transparent';
        } else if (i > faction.votesFor + faction.votesAgainst) {
          context.fillStyle = ABSTENTIONS_FILL_COLOR;
        } else if (i > faction.votesFor) {
          context.fillStyle = VOTED_AGAINST_FILL_COLOR;
        } else {
          context.fillStyle = VOTED_FOR_FILL_COLOR;
        }

        context.roundRect((i - 1) * 35, index * 70 + 30, 30, 30, 5);
        context.fill();
        if (i > faction.votesFor + faction.abstentions + faction.votesAgainst) {
          context.lineWidth = 2;
          context.strokeStyle = TEXT_COLOR;
          context.stroke();
        }
      }
    });

    return canvas;
  }

  private getWrappedLines(text: string, maxWidth: number) {
    const canvas = createCanvas(maxWidth, 1000);
    const context = canvas.getContext('2d');

    context.font = 'bold 18pt Verdana';

    const words = text.split(' ');
    const lines = [];

    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = context.measureText(`${currentLine} ${word}`).width;
      if (width < maxWidth) {
        currentLine = `${currentLine} ${word}`;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);

    return lines;
  }
}
