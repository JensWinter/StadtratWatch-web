import { describe, expect, it } from 'bun:test';

import type { MajorityRequirement } from '@srw-astro/models/session-scan';

import { ImagesGenerator } from './images-generator.ts';
import type { Voting } from './model.ts';

function fontsWith(...installedFamilies: string[]) {
  return { has: (family: string) => installedFamilies.includes(family) };
}

function createVoting(majorityRequirement: MajorityRequirement): Voting {
  return {
    sessionId: '2026-08-27',
    votingId: 1,
    date: '2026-08-27',
    motionType: 'Tagesordnung',
    motionId: '',
    subjectTitle: 'Stadtschreiberstipendium für 2027 umsetzen',
    accepted: false,
    majorityRequirement,
    votes: [{ faction: 'Fraktion', votesFor: 29, votesAgainst: 16, abstentions: 0, notVoted: 1 }],
  };
}

function renderPixels(majorityRequirement: MajorityRequirement): Uint8ClampedArray {
  const [image] = new ImagesGenerator(fontsWith('Verdana')).generateVotingImages([createVoting(majorityRequirement)]);
  if (!image) throw new Error('no image generated');
  return image.canvas.getContext('2d').getImageData(0, 0, image.canvas.width, image.canvas.height).data;
}

describe('ImagesGenerator', () => {
  it('refuses to start when Verdana is not installed', () => {
    expect(() => new ImagesGenerator(fontsWith('Arial'))).toThrow('Font "Verdana" is not installed.');
  });

  it('starts when Verdana is installed', () => {
    expect(() => new ImagesGenerator(fontsWith('Arial', 'Verdana'))).not.toThrow();
  });

  it('adds a line to the image for a majority requirement other than the simple majority', () => {
    expect(renderPixels('two-thirds-of-present')).not.toEqual(renderPixels('simple'));
  });

  it('names the majority requirement in that line', () => {
    expect(renderPixels('two-thirds-of-present')).not.toEqual(renderPixels('three-quarters-of-members'));
  });
});
