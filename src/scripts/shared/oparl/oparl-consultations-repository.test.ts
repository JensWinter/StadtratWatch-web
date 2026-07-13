import { assertEquals } from '@std/assert';
import { OparlConsultation } from '@srw-astro/models/oparl';
import {
  OparlConsultationsInMemoryRepository,
  OparlConsultationsRepository,
} from './oparl-consultations-repository.ts';

Deno.test('OparlConsultationsInMemoryRepository', async (t) => {
  const mockConsultations: OparlConsultation[] = [
    {
      id: 'https://example.org/oparl/v1.1/consultations/1',
      type: 'https://schema.oparl.org/1.1/Consultation',
      name: 'First consultation',
      meeting: 'https://example.org/oparl/v1.1/meetings/1',
      paper: 'https://example.org/oparl/v1.1/papers/100',
      agendaItem: 'https://example.org/oparl/v1.1/agenda-items/1',
    },
    {
      id: 'https://example.org/oparl/v1.1/consultations/2',
      type: 'https://schema.oparl.org/1.1/Consultation',
      name: 'Second consultation',
      meeting: 'https://example.org/oparl/v1.1/meetings/1',
      paper: 'https://example.org/oparl/v1.1/papers/200',
    },
  ];

  await t.step('should implement OparlConsultationsRepository interface', () => {
    const repository: OparlConsultationsRepository = new OparlConsultationsInMemoryRepository(mockConsultations);
    assertEquals(typeof repository.getConsultationById, 'function');
  });

  await t.step('getConsultationById', async (t) => {
    const repository = new OparlConsultationsInMemoryRepository(mockConsultations);

    await t.step('should return consultation when ID exists', () => {
      const result = repository.getConsultationById('https://example.org/oparl/v1.1/consultations/1');
      assertEquals(result, mockConsultations[0]);
    });

    await t.step('should return null when ID does not exist', () => {
      const result = repository.getConsultationById('https://example.org/oparl/v1.1/consultations/999');
      assertEquals(result, null);
    });

    await t.step('should return null for empty string ID', () => {
      const result = repository.getConsultationById('');
      assertEquals(result, null);
    });
  });

  await t.step('should work with empty array', () => {
    const repository = new OparlConsultationsInMemoryRepository([]);
    const result = repository.getConsultationById('https://example.org/oparl/v1.1/consultations/1');
    assertEquals(result, null);
  });

  await t.step('should return first match for duplicate IDs', () => {
    const duplicates: OparlConsultation[] = [
      {
        id: 'https://example.org/oparl/v1.1/consultations/1',
        type: 'https://schema.oparl.org/1.1/Consultation',
        name: 'First occurrence',
      },
      {
        id: 'https://example.org/oparl/v1.1/consultations/1',
        type: 'https://schema.oparl.org/1.1/Consultation',
        name: 'Second occurrence',
      },
    ];
    const repository = new OparlConsultationsInMemoryRepository(duplicates);
    const result = repository.getConsultationById('https://example.org/oparl/v1.1/consultations/1');
    assertEquals(result?.name, 'First occurrence');
  });
});
