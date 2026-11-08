import type { SessionScanItem } from '@srw-astro/models/session-scan';
import styles from '../../components/SelectionList.module.css';

interface Props {
  votings: SessionScanItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

// Sorted by videoTimestamp for display; selection maps back to the original index.
export function VotingSelection({ votings, selectedIndex, onSelect }: Props) {
  const sorted = votings
    .map((voting, index) => ({ voting, index }))
    .sort((a, b) => a.voting.videoTimestamp.localeCompare(b.voting.videoTimestamp));

  return (
    <ul className={styles.list}>
      {sorted.map(({ voting, index }) => (
        <li key={index}>
          <button
            type="button"
            className={`${styles.item} ${index === selectedIndex ? styles.selected : ''}`}
            onClick={() => onSelect(index)}
          >
            {voting.videoTimestamp}: {voting.votingSubject.agendaItem} - {voting.votingSubject.motionId}
          </button>
        </li>
      ))}
    </ul>
  );
}
