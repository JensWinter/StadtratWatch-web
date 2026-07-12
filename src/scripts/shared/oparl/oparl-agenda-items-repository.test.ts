import { assertEquals } from '@std/assert';
import { OparlAgendaItem } from '@srw-astro/models/oparl';
import { OparlAgendaItemsInMemoryRepository, OparlAgendaItemsRepository } from './oparl-agenda-items-repository.ts';

Deno.test('OparlAgendaItemsInMemoryRepository', async (t) => {
  const mockAgendaItems: OparlAgendaItem[] = [
    {
      id: 'https://example.org/oparl/v1.1/agenda-items/1',
      type: 'https://schema.oparl.org/1.1/AgendaItem',
      name: 'First agenda item',
      order: 1,
      meeting: 'https://example.org/oparl/v1.1/meetings/1',
      number: '1.1',
      public: true,
      consultation: 'https://example.org/oparl/v1.1/consultations/1',
      result: 'Approved',
    },
    {
      id: 'https://example.org/oparl/v1.1/agenda-items/2',
      type: 'https://schema.oparl.org/1.1/AgendaItem',
      name: 'Second agenda item',
      order: 2,
      meeting: 'https://example.org/oparl/v1.1/meetings/1',
      number: '1.2',
      public: false,
    },
    {
      id: 'https://example.org/oparl/v1.1/agenda-items/3',
      type: 'https://schema.oparl.org/1.1/AgendaItem',
      name: 'Third agenda item',
      order: 3,
      meeting: 'https://example.org/oparl/v1.1/meetings/2',
      number: '2.1',
      public: true,
      result: 'Rejected',
    },
  ];

  await t.step('should implement OparlAgendaItemsRepository interface', () => {
    const repository: OparlAgendaItemsRepository = new OparlAgendaItemsInMemoryRepository(
      mockAgendaItems,
    );
    assertEquals(typeof repository.getAgendaItemById, 'function');
  });

  await t.step('getAgendaItemById', async (t) => {
    const repository = new OparlAgendaItemsInMemoryRepository(mockAgendaItems);

    await t.step('should return agenda item when ID exists', () => {
      const result = repository.getAgendaItemById('https://example.org/oparl/v1.1/agenda-items/1');
      assertEquals(result, mockAgendaItems[0]);
    });

    await t.step('should return correct agenda item for each ID', () => {
      const result1 = repository.getAgendaItemById('https://example.org/oparl/v1.1/agenda-items/1');
      const result2 = repository.getAgendaItemById('https://example.org/oparl/v1.1/agenda-items/2');
      const result3 = repository.getAgendaItemById('https://example.org/oparl/v1.1/agenda-items/3');

      assertEquals(result1?.name, 'First agenda item');
      assertEquals(result2?.name, 'Second agenda item');
      assertEquals(result3?.name, 'Third agenda item');
    });

    await t.step('should return null when ID does not exist', () => {
      const result = repository.getAgendaItemById('https://example.org/oparl/v1.1/agenda-items/999');
      assertEquals(result, null);
    });

    await t.step('should return null for empty string ID', () => {
      const result = repository.getAgendaItemById('');
      assertEquals(result, null);
    });

    await t.step('should return null for malformed ID', () => {
      const result = repository.getAgendaItemById('not-a-valid-url');
      assertEquals(result, null);
    });

    await t.step('should handle agenda items with optional fields', () => {
      const result = repository.getAgendaItemById('https://example.org/oparl/v1.1/agenda-items/2');
      assertEquals(result?.consultation, undefined);
      assertEquals(result?.result, undefined);
    });

    await t.step('should handle agenda items with all fields', () => {
      const result = repository.getAgendaItemById('https://example.org/oparl/v1.1/agenda-items/1');
      assertEquals(result?.meeting, 'https://example.org/oparl/v1.1/meetings/1');
      assertEquals(result?.number, '1.1');
      assertEquals(result?.public, true);
      assertEquals(result?.consultation, 'https://example.org/oparl/v1.1/consultations/1');
      assertEquals(result?.result, 'Approved');
    });
  });

  await t.step('should work with empty array', () => {
    const repository = new OparlAgendaItemsInMemoryRepository([]);
    const result = repository.getAgendaItemById('https://example.org/oparl/v1.1/agenda-items/1');
    assertEquals(result, null);
  });

  await t.step('should work with single item array', () => {
    const repository = new OparlAgendaItemsInMemoryRepository([mockAgendaItems[0]]);
    const result1 = repository.getAgendaItemById('https://example.org/oparl/v1.1/agenda-items/1');
    const result2 = repository.getAgendaItemById('https://example.org/oparl/v1.1/agenda-items/2');

    assertEquals(result1, mockAgendaItems[0]);
    assertEquals(result2, null);
  });

  await t.step('should handle duplicate IDs (returns first match)', () => {
    const duplicateItems: OparlAgendaItem[] = [
      {
        id: 'https://example.org/oparl/v1.1/agenda-items/1',
        type: 'https://schema.oparl.org/1.1/AgendaItem',
        name: 'First occurrence',
        order: 1,
      },
      {
        id: 'https://example.org/oparl/v1.1/agenda-items/1',
        type: 'https://schema.oparl.org/1.1/AgendaItem',
        name: 'Second occurrence',
        order: 2,
      },
    ];
    const repository = new OparlAgendaItemsInMemoryRepository(duplicateItems);
    const result = repository.getAgendaItemById('https://example.org/oparl/v1.1/agenda-items/1');

    assertEquals(result?.name, 'First occurrence');
  });

  await t.step('should be case-sensitive for IDs', () => {
    const repository = new OparlAgendaItemsInMemoryRepository(mockAgendaItems);
    const result1 = repository.getAgendaItemById('https://example.org/oparl/v1.1/agenda-items/1');
    const result2 = repository.getAgendaItemById('https://EXAMPLE.ORG/oparl/v1.1/agenda-items/1');

    assertEquals(result1, mockAgendaItems[0]);
    assertEquals(result2, null);
  });

  await t.step('getAgendaItemsByMeeting', async (t) => {
    const repository = new OparlAgendaItemsInMemoryRepository(mockAgendaItems);

    await t.step('should return all agenda items of a meeting', () => {
      const result = repository.getAgendaItemsByMeeting('https://example.org/oparl/v1.1/meetings/1');
      assertEquals(result.map((a) => a.id), [
        'https://example.org/oparl/v1.1/agenda-items/1',
        'https://example.org/oparl/v1.1/agenda-items/2',
      ]);
    });

    await t.step('should return single agenda item for a meeting with one item', () => {
      const result = repository.getAgendaItemsByMeeting('https://example.org/oparl/v1.1/meetings/2');
      assertEquals(result.map((a) => a.id), ['https://example.org/oparl/v1.1/agenda-items/3']);
    });

    await t.step('should return empty array for unknown meeting', () => {
      const result = repository.getAgendaItemsByMeeting('https://example.org/oparl/v1.1/meetings/999');
      assertEquals(result, []);
    });
  });
});
