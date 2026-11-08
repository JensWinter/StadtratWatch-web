import type { Registry } from '@srw-astro/models/registry';

const registries = Object.values(
  import.meta.glob<Registry>('../../../data/*/registry.json', { eager: true, import: 'default' }),
);

export function findParliamentPeriodOfSession(sessionDate: string): Registry | undefined {
  return registries.find((registry) => registry.sessions.some((session) => session.id === sessionDate));
}
