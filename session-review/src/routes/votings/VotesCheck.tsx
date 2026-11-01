import { useState } from 'react';
import type { Voting, SessionConfig, ConfigName, NamesColumn } from '../../types';
import { env } from '../../constants/env';
import { voteColor } from '../../constants/domain';

interface Props {
  sessionDate: string;
  voting: Voting;
  config: SessionConfig;
}

interface ImageSize {
  width: number;
  height: number;
}

const DISPLAY_HEIGHT = 800;
const DOT_SIZE = 10;
const NAME_LABEL_GAP_TO_TEST_PIXEL = 15;

function seatTop(seat: ConfigName, column: NamesColumn, namesRowHeight: number): number {
  return column.top + seat.rowIndex * namesRowHeight;
}

export function VotesCheck({ sessionDate, voting, config }: Props) {
  const src = `${env.awsCloudFrontSessionsRawBaseFolder}/${sessionDate}/${voting.votingFilename}`;
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [showConfiguredNames, setShowConfiguredNames] = useState(true);

  const scale = imageSize ? DISPLAY_HEIGHT / imageSize.height : 0;
  const { namesColumns, namesRowHeight } = config.layout;

  const nameLabels = config.names.map((seat) => {
    const column = namesColumns[seat.columnIndex];
    return {
      name: seat.name,
      top: seatTop(seat, column, namesRowHeight) * scale,
      left: column.left * scale,
      width: (column.testPixelXOffset - NAME_LABEL_GAP_TO_TEST_PIXEL) * scale,
      height: namesRowHeight * scale,
    };
  });

  const dots = voting.votes.flatMap((vote) => {
    const seat = config.names.find((n) => n.name === vote.name);
    if (!seat) {
      console.warn(`No seat config for vote name: ${vote.name} — dot skipped`);
      return [];
    }
    const column = namesColumns[seat.columnIndex];
    return [{
      name: vote.name,
      top: (seatTop(seat, column, namesRowHeight) + column.testPixelYOffset) * scale - DOT_SIZE / 2,
      left: (column.left + column.testPixelXOffset) * scale - DOT_SIZE / 2,
      color: voteColor(vote.vote),
    }];
  });

  return (
    <div style={{ position: 'relative', height: DISPLAY_HEIGHT, width: imageSize ? imageSize.width * scale : 'auto' }}>
      <img
        src={src}
        style={{ height: '100%', display: 'block' }}
        alt=""
        onLoad={(e) =>
          setImageSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
      />
      {imageSize && showConfiguredNames && nameLabels.map((label) => (
        <div
          key={label.name}
          style={{
            position: 'absolute',
            top: label.top,
            left: label.left,
            width: label.width,
            height: label.height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              color: 'black',
              fontSize: 11,
              lineHeight: 1,
              padding: '1px 3px',
              whiteSpace: 'nowrap',
            }}
          >
            {label.name}
          </span>
        </div>
      ))}
      {imageSize && dots.map((dot) => (
        <div
          key={dot.name}
          style={{
            position: 'absolute',
            top: dot.top,
            left: dot.left,
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: '50%',
            background: dot.color,
            border: '1px solid black',
          }}
        />
      ))}
      <label
        style={{
          position: 'absolute',
          top: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          whiteSpace: 'nowrap',
        }}
      >
        <input
          type="checkbox"
          checked={showConfiguredNames}
          onChange={(e) => setShowConfiguredNames(e.target.checked)}
        />
        Konfigurierte Namen einblenden
      </label>
    </div>
  );
}
