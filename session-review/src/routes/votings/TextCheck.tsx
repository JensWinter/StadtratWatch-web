import type { SessionScanItem } from '@srw-astro/models/session-scan';
import type { VotingsAction } from './votingsReducer';

interface Props {
  voting: SessionScanItem;
  dispatch: (action: VotingsAction) => void;
}

export function TextCheck({ voting, dispatch }: Props) {
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 10 }}>
        <label>
          Zeitpunkt
          <br />
          <input
            value={voting.videoTimestamp}
            onChange={(e) => dispatch({ type: 'setTimestamp', value: e.target.value })}
          />
        </label>
        <label>
          TOP
          <br />
          <input
            value={voting.votingSubject.agendaItem}
            onChange={(e) => dispatch({ type: 'setAgendaItem', value: e.target.value })}
          />
        </label>
        <label>
          Nummer
          <br />
          <input
            value={voting.votingSubject.motionId}
            onChange={(e) => dispatch({ type: 'setMotionId', value: e.target.value })}
          />
        </label>
      </div>

      <div>
        <label>
          Titel
          <br />
          <textarea
            rows={3}
            style={{ width: 1000 }}
            value={voting.votingSubject.title}
            onChange={(e) => dispatch({ type: 'setTitle', value: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}
