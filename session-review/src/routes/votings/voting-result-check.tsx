import type { Registry } from '@srw-astro/models/registry';
import {
  findPresentMembersViolation,
  isMajorityRequirement,
  majorityRequirementDisplayNames,
  majorityRequirements,
  type MajorityRequirement,
  type SessionScanItem,
} from '@srw-astro/models/session-scan';
import { getVoteCounts, votingAccepted } from '@srw-astro/models/voting-breakdown';
import type { VotingsAction } from './votingsReducer';

interface Props {
  voting: SessionScanItem;
  parliamentPeriod: Registry | undefined;
  dispatch: (action: VotingsAction) => void;
}

function parseMajorityRequirement(value: string): MajorityRequirement | undefined {
  return isMajorityRequirement(value) ? value : undefined;
}

function parsePresentMembers(value: string): number | undefined {
  const presentMembers = Number(value);
  const isWholeCount = value !== '' && Number.isInteger(presentMembers) && presentMembers >= 0;
  return isWholeCount ? presentMembers : undefined;
}

function describeVotingResult(voting: SessionScanItem, parliamentPeriod: Registry | undefined): string {
  if (!parliamentPeriod) return 'Nicht berechenbar: Sitzung fehlt in registry.json';

  const violation = findPresentMembersViolation(voting);
  if (violation) return `Nicht berechenbar: ${violation}`;

  return votingAccepted(parliamentPeriod, voting) ? 'Angenommen' : 'Abgelehnt';
}

export function VotingResultCheck({ voting, parliamentPeriod, dispatch }: Readonly<Props>) {
  const { J: yes, N: no, E: abstentions } = getVoteCounts(voting);

  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'flex-end', margin: '0.5rem 0' }}>
      <label>
        Mehrheitserfordernis
        <br />
        <select
          value={voting.majorityRequirement ?? ''}
          onChange={(e) => dispatch({ type: 'setMajorityRequirement', value: parseMajorityRequirement(e.target.value) })}
        >
          <option value=""></option>
          {majorityRequirements.map((majorityRequirement) => (
            <option key={majorityRequirement} value={majorityRequirement}>
              {majorityRequirementDisplayNames[majorityRequirement]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Anwesend
        <br />
        <input
          type="number"
          min={0}
          step={1}
          style={{ width: 80 }}
          value={voting.presentMembers ?? ''}
          onChange={(e) => dispatch({ type: 'setPresentMembers', value: parsePresentMembers(e.target.value) })}
        />
      </label>
      <div>
        Ja {yes} · Nein {no} · Enthaltung {abstentions}
        <br />
        <strong>Abstimmungsergebnis: {describeVotingResult(voting, parliamentPeriod)}</strong>
      </div>
    </div>
  );
}
