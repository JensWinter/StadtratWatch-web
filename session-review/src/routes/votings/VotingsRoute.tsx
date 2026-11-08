import { useEffect, useReducer } from 'react';
import { useParams } from 'react-router-dom';
import type { SessionScanItem } from '@srw-astro/models/session-scan';
import { env } from '../../constants/env';
import { useSessionData } from '../../hooks/useSessionData';
import { StatusGate } from '../../components/StatusGate';
import { downloadJson } from '../../utils/download';
import { votingsReducer, initialVotingsState } from './votingsReducer';
import { VotingSelection } from './VotingSelection';
import { VotesCheck } from './VotesCheck';
import { TextCheck } from './TextCheck';
import { VotingInfo } from './VotingInfo';
import { VotingResultCheck } from './voting-result-check';
import { findParliamentPeriodOfSession } from '../../data/parliament-periods';

const dataUrl = (date: string) =>
  `${env.awsCloudFrontSessionsScanResultsRedactedBaseFolder}/session-scan-${date}.json`;

export function VotingsRoute() {
  const { sessionDate } = useParams();
  const { loading, error, data, config } = useSessionData<SessionScanItem[]>(sessionDate, dataUrl);

  const [state, dispatch] = useReducer(votingsReducer, initialVotingsState);

  useEffect(() => {
    if (data) dispatch({ type: 'init', votings: data });
  }, [data]);

  const selected = state.votings[state.selectedIndex] ?? null;
  const parliamentPeriod = sessionDate ? findParliamentPeriodOfSession(sessionDate) : undefined;

  function save() {
    if (!sessionDate) return;
    downloadJson(`session-scan-${sessionDate}.json`, state.votings);
  }

  return (
    <StatusGate loading={loading} error={error} empty={!!data && data.length === 0}>
      <div style={{ display: 'flex', height: '100%' }}>
        <div style={{ width: 300, background: '#eee', overflowY: 'auto' }}>
          <VotingSelection
            votings={state.votings}
            selectedIndex={state.selectedIndex}
            onSelect={(index) => dispatch({ type: 'select', index })}
          />
        </div>

        <div style={{ padding: '0 1rem' }}>
          {selected && config && sessionDate && (
            <div style={{ display: 'flex', flexDirection: 'row' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <VotesCheck sessionDate={sessionDate} voting={selected} config={config} />
                <VotingResultCheck voting={selected} parliamentPeriod={parliamentPeriod} dispatch={dispatch} />
                <TextCheck key={state.selectedIndex} voting={selected} dispatch={dispatch} />
              </div>
              <div style={{ width: 300 }}>
                <VotingInfo key={state.selectedIndex} voting={selected} config={config} dispatch={dispatch} />
              </div>
            </div>
          )}
          <button type="button" onClick={save}>Save</button>
        </div>
      </div>
    </StatusGate>
  );
}
