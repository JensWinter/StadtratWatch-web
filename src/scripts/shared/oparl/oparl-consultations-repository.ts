import { OparlConsultation } from '@srw-astro/models/oparl';

export interface OparlConsultationsRepository {
  getConsultationById(consultationId: string): OparlConsultation | null;
}

export class OparlConsultationsInMemoryRepository implements OparlConsultationsRepository {
  constructor(private readonly consultations: OparlConsultation[]) {
  }

  public getConsultationById(consultationId: string): OparlConsultation | null {
    return this.consultations.find((c) => c.id === consultationId) || null;
  }
}
