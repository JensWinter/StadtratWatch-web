import type { SessionScanItem } from '@srw-astro/models/session-scan';
import type { SessionConfig } from '../../types';
import type { VotingsAction } from './votingsReducer';
import { timestampToSeconds } from '../../utils/time';
import {
  VOTING_TYPES,
  VOTING_COMMITTEES,
  VOTING_DEPUTIES,
  VOTING_TOWN_ADVISORY_COUNCILS,
} from '../../constants/domain';

interface Props {
  voting: SessionScanItem;
  config: SessionConfig;
  dispatch: (action: VotingsAction) => void;
}

function AuthorGroup({
  label,
  options,
  selected,
  dispatch,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  dispatch: (action: VotingsAction) => void;
}) {
  return (
    <fieldset>
      <legend>{label}</legend>
      {options.map((option) => (
        <label key={option} style={{ display: 'block' }}>
          <input
            type="checkbox"
            checked={selected.includes(option)}
            onChange={() => dispatch({ type: 'toggleAuthor', author: option })}
          />
          {option}
        </label>
      ))}
    </fieldset>
  );
}

export function VotingInfo({ voting, config, dispatch }: Props) {
  const factions = Array.from(new Set(config.names.map((n) => n.faction))).sort();
  const names = config.names.map((n) => n.name).sort();

  const secs = timestampToSeconds(voting.videoTimestamp);
  const youtubeUrl = secs !== null ? `${config.youtubeUrl}?t=${secs}s` : config.youtubeUrl;

  const authors = voting.votingSubject.authors;

  return (
    <div>
      <div>
        <a href={youtubeUrl} target="_blank" rel="noreferrer">youtube.com</a>
      </div>

      <div>
        <label>
          Typ
          <br />
          <select
            value={voting.votingSubject.type ?? ''}
            onChange={(e) => dispatch({ type: 'setType', value: e.target.value })}
          >
            <option value=""></option>
            {VOTING_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <strong>Von</strong>
        <AuthorGroup label="Fraktionen" options={factions} selected={authors} dispatch={dispatch} />
        <AuthorGroup label="Ausschüsse" options={VOTING_COMMITTEES} selected={authors} dispatch={dispatch} />
        <AuthorGroup label="Beigeordnete*r" options={VOTING_DEPUTIES} selected={authors} dispatch={dispatch} />
        <AuthorGroup label="Ortschaftsrat" options={VOTING_TOWN_ADVISORY_COUNCILS} selected={authors} dispatch={dispatch} />
        <AuthorGroup label="Abgeordnete*r" options={names} selected={authors} dispatch={dispatch} />
      </div>
    </div>
  );
}
