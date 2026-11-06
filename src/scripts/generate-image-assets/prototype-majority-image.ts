// PROTOTYPE — wipe me. Rough drafts of the voting image's result block with a Mehrheitserfordernis (#621).
// Run: bun src/scripts/generate-image-assets/prototype-majority-image.ts
import { createCanvas, type SKRSContext2D } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';

const COLUMN_WIDTH = 540;
const BACKGROUND_COLOR = '#3C3C3C';
const GREEN = '#4EA72E';
const RED = '#ED5642';
const GREY = '#DDDDDD';
const DARK = '#3C3C3C';

type Case = { label: string; yes: number; no: number; abstain: number; present: number | null; required: number | null };
const cases: Case[] = [
  { label: '⅔ verfehlt (29:16:0, 46 anwesend)', yes: 29, no: 16, abstain: 0, present: 46, required: 31 },
  { label: '⅔ erreicht (43:0:0, 46 anwesend)', yes: 43, no: 0, abstain: 0, present: 46, required: 31 },
  { label: 'einfache Mehrheit (35:9:3)', yes: 35, no: 9, abstain: 3, present: null, required: null },
];

const accepted = (c: Case) => (c.required === null ? c.yes > c.no : c.yes >= c.required);

function box(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, fill: string, r = 5) {
  ctx.beginPath();
  ctx.fillStyle = fill;
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function text(ctx: SKRSContext2D, value: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'center') {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
}

function threeBoxes(ctx: SKRSContext2D, c: Case, y: number) {
  [
    [c.yes, 'Dafür', 80, GREEN],
    [c.no, 'Dagegen', 270, RED],
    [c.abstain, 'Enthalten', 460, GREY],
  ].forEach(([votes, label, x, fill]) => {
    text(ctx, String(label), Number(x), y + 20, '14pt Verdana', 'white');
    box(ctx, Number(x) - 80, y + 35, 160, 40, String(fill));
    text(ctx, String(votes), Number(x), y + 65, 'bold 18pt Verdana', DARK);
  });
}

// A: today's block, plus one line under the verdict when a qualified requirement applies.
function variantA(ctx: SKRSContext2D, c: Case) {
  threeBoxes(ctx, c, 0);
  box(ctx, 0, 90, COLUMN_WIDTH, 80, accepted(c) ? GREEN : RED, 10);
  text(ctx, accepted(c) ? 'Angenommen' : 'Abgelehnt', COLUMN_WIDTH / 2, 140, 'bold 24pt Verdana', DARK);
  if (c.required !== null) {
    text(ctx, `Zweidrittelmehrheit nötig: ${c.required} von ${c.present} Anwesenden`, COLUMN_WIDTH / 2, 200, '13pt Verdana', GREY);
  }
}

// B: one bar against the Bezugsgröße with a threshold marker instead of three boxes.
function variantB(ctx: SKRSContext2D, c: Case) {
  const total = c.present ?? c.yes + c.no + c.abstain;
  const scale = COLUMN_WIDTH / total;
  let x = 0;
  [
    [c.yes, GREEN],
    [c.no, RED],
    [c.abstain, GREY],
    [total - c.yes - c.no - c.abstain, '#777777'],
  ].forEach(([votes, fill]) => {
    const w = Number(votes) * scale;
    if (w > 0) {
      ctx.fillStyle = String(fill);
      ctx.fillRect(x, 30, w, 44);
      if (Number(votes) > 2 && fill !== '#777777') text(ctx, String(votes), x + w / 2, 60, 'bold 16pt Verdana', DARK);
    }
    x += w;
  });
  const markerVotes = c.required ?? (c.yes + c.no) / 2;
  const markerX = markerVotes * scale;
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(markerX, 18);
  ctx.lineTo(markerX, 84);
  ctx.stroke();
  ctx.setLineDash([]);
  text(ctx, c.required !== null ? `${c.required} Ja nötig (⅔)` : 'mehr Ja als Nein', markerX, 14, '12pt Verdana', 'white');
  box(ctx, 0, 100, COLUMN_WIDTH, 80, accepted(c) ? GREEN : RED, 10);
  text(ctx, accepted(c) ? 'Angenommen' : 'Abgelehnt', COLUMN_WIDTH / 2, 150, 'bold 24pt Verdana', DARK);
}

// C: today's boxes; the verdict box carries the reason as a second line, always.
function variantC(ctx: SKRSContext2D, c: Case) {
  threeBoxes(ctx, c, 0);
  box(ctx, 0, 90, COLUMN_WIDTH, 100, accepted(c) ? GREEN : RED, 10);
  text(ctx, accepted(c) ? 'Angenommen' : 'Abgelehnt', COLUMN_WIDTH / 2, 132, 'bold 24pt Verdana', DARK);
  const reason =
    c.required !== null
      ? `${c.yes} Ja · nötig ${c.required} (⅔ von ${c.present} Anwesenden)`
      : 'einfache Mehrheit: mehr Ja als Nein';
  text(ctx, reason, COLUMN_WIDTH / 2, 170, '13pt Verdana', DARK);
}

const variants = [
  ['A — Hinweis unter dem Ergebnis', variantA],
  ['B — Schwellen-Balken', variantB],
  ['C — Rechenweg im Ergebnis', variantC],
] as const;

const CELL_HEIGHT = 260;
const MARGIN = 40;
const canvas = createCanvas(MARGIN + cases.length * (COLUMN_WIDTH + MARGIN), 40 + variants.length * CELL_HEIGHT);
const ctx = canvas.getContext('2d');
ctx.fillStyle = BACKGROUND_COLOR;
ctx.fillRect(0, 0, canvas.width, canvas.height);

variants.forEach(([name, draw], row) => {
  cases.forEach((c, column) => {
    const originX = MARGIN + column * (COLUMN_WIDTH + MARGIN);
    const originY = 40 + row * CELL_HEIGHT;
    text(ctx, `${name}  ·  ${c.label}`, originX, originY - 8, 'italic 11pt Verdana', '#AAAAAA', 'left');
    ctx.save();
    ctx.translate(originX, originY + 10);
    draw(ctx, c);
    ctx.restore();
  });
});

const outputPath = new URL('./prototype-majority-image.png', import.meta.url).pathname;
writeFileSync(outputPath, canvas.toBuffer('image/png'));
console.log(outputPath);
