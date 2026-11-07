import { describe, expect, test } from 'vitest';
import {
  findSeatCountMismatch,
  getLegalMemberCount,
  type Registry,
} from './registry.ts';

function createRegistry(
  factionSeats: number[],
  partySeats: number[],
): Registry {
  return {
    id: 'magdeburg-8',
    name: 'Stadtrat Magdeburg 8',
    lastUpdate: '2024-07-08',
    sessions: [],
    factions: factionSeats.map((seats, index) => ({
      id: `faction-${index}`,
      name: `Faction ${index}`,
      seats,
    })),
    parties: partySeats.map((seats, index) => ({
      id: `party-${index}`,
      name: `Party ${index}`,
      seats,
    })),
    persons: [],
  };
}

describe('getLegalMemberCount', () => {
  test('counts all faction seats, the mayor as a faction of one included', () => {
    const registry = createRegistry([15, 13, 10, 6, 6, 3, 3, 1], []);

    expect(getLegalMemberCount(registry)).toBe(57);
  });
});

describe('findSeatCountMismatch', () => {
  test('accepts faction and party seats that add up to the same count', () => {
    const registry = createRegistry([30, 26, 1], [40, 16, 1]);

    expect(findSeatCountMismatch(registry)).toBeUndefined();
  });

  test('names both counts when faction and party seats differ', () => {
    const registry = createRegistry([30, 26, 1], [40, 16]);

    expect(findSeatCountMismatch(registry)).toBe(
      'faction seats add up to 57, party seats to 56',
    );
  });

  test('rejects a registry without seats', () => {
    const registry = createRegistry([], []);

    expect(findSeatCountMismatch(registry)).toBe('faction seats add up to 0');
  });
});
