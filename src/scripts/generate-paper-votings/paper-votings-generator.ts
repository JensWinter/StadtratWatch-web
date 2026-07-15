import { getVotesByFactions, votingAccepted } from '@srw-astro/models/voting-breakdown';
import { SessionScanItem } from '@srw-astro/models/session-scan';
import { Registry } from '@srw-astro/models/registry';
import { VoteResult } from '@srw-astro/models/session';
import { PeriodData, PeriodDataStore } from './period-data-store.ts';
import { PaperVotingsWriter } from './paper-votings-writer.ts';
import { PaperVotingItem, PaperVotingsAssetDto, PaperVotingsDto, VoteCounts } from './model.ts';

export class PaperVotingsGenerator {
  constructor(
    private readonly periodDataStore: PeriodDataStore,
    private readonly writer: PaperVotingsWriter,
  ) {
  }

  public generatePaperVotings(): void {
    const votingsByPaperId = new Map<number, PaperVotingItem[]>();

    for (const period of this.periodDataStore.loadPeriods()) {
      console.log(`Collecting paper votings for period ${period.registry.id}`);
      this.collectPeriodVotings(period, votingsByPaperId);
    }

    const paperVotings = this.sortPaperVotings(votingsByPaperId);
    console.log(`Generated votings for ${paperVotings.length} papers`);
    this.writer.writePaperVotings(this.batchPaperVotings(paperVotings));
  }

  private collectPeriodVotings(period: PeriodData, votingsByPaperId: Map<number, PaperVotingItem[]>): void {
    for (const [sessionDate, paperIdByAgendaItem] of Object.entries(period.votingPaperMap)) {
      const sessionScan = period.sessionScansByDate[sessionDate] ?? [];

      for (const [agendaItem, paperId] of Object.entries(paperIdByAgendaItem)) {
        const scansOfAgendaItem = sessionScan.filter((scan) => scan.votingSubject.agendaItem === agendaItem);

        for (const scan of scansOfAgendaItem) {
          const votings = votingsByPaperId.get(paperId) ?? [];
          votings.push(this.toPaperVotingItem(scan, sessionDate, period.registry));
          votingsByPaperId.set(paperId, votings);
        }
      }
    }
  }

  private toPaperVotingItem(scan: SessionScanItem, sessionDate: string, registry: Registry): PaperVotingItem {
    return {
      parliamentPeriodId: registry.id,
      sessionId: sessionDate,
      date: sessionDate,
      votingId: getVotingId(scan),
      agendaItem: scan.votingSubject.agendaItem,
      title: scan.votingSubject.title,
      type: scan.votingSubject.type || '',
      accepted: votingAccepted(scan),
      counts: countVotes(scan),
      votesByFactions: getVotesByFactions(registry, scan.votes),
    };
  }

  private sortPaperVotings(votingsByPaperId: Map<number, PaperVotingItem[]>): PaperVotingsDto[] {
    return [...votingsByPaperId.entries()]
      .map<PaperVotingsDto>(([paperId, votings]) => ({
        paperId,
        votings: votings.toSorted((a, b) => {
          const dateComparison = b.date.localeCompare(a.date);
          return dateComparison !== 0 ? dateComparison : a.votingId - b.votingId;
        }),
      }))
      .toSorted((a, b) => a.paperId - b.paperId);
  }

  private batchPaperVotings(paperVotings: PaperVotingsDto[]): PaperVotingsAssetDto[] {
    const paperVotingsByBatchNo = new Map<string, PaperVotingsDto[]>();

    for (const entry of paperVotings) {
      const batchNo = getBatchNo(entry.paperId);
      const batch = paperVotingsByBatchNo.get(batchNo) ?? [];
      batch.push(entry);
      paperVotingsByBatchNo.set(batchNo, batch);
    }

    return [...paperVotingsByBatchNo.entries()]
      .map<PaperVotingsAssetDto>(([batchNo, entries]) => ({ batchNo, paperVotings: entries }))
      .toSorted((a, b) => a.batchNo.localeCompare(b.batchNo));
  }
}

// The scan filename encodes the voting id, mirroring getVotingId in the web app's session-utils.
function getVotingId(scan: SessionScanItem): number {
  return +scan.votingFilename.substring(11, 14);
}

function getBatchNo(paperId: number): string {
  return `${Math.floor(paperId / 100)}`.padStart(4, '0');
}

function countVotes(scan: SessionScanItem): VoteCounts {
  const counts: VoteCounts = { J: 0, N: 0, E: 0, O: 0 };

  for (const vote of scan.votes) {
    switch (vote.vote) {
      case VoteResult.VOTE_FOR:
        counts.J++;
        break;
      case VoteResult.VOTE_AGAINST:
        counts.N++;
        break;
      case VoteResult.VOTE_ABSTENTION:
        counts.E++;
        break;
      default:
        counts.O++;
    }
  }

  return counts;
}
