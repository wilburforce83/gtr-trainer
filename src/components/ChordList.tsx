import type { Voicing } from '../chords/voicings';
import ChordDiagram from './ChordDiagram';

type Props = {
  voicings: Voicing[];
  selectedId?: string;
  onSelect(voicing: Voicing): void;
  onPlay(voicing: Voicing): void;
};

export default function ChordList({ voicings, selectedId, onSelect, onPlay }: Props) {
  return (
    <div className="chord-list">
      <div className="chord-list__grid">
        {voicings.map((voicing) => (
          <div
            key={voicing.id ?? `${voicing.root}-${voicing.chordKind}`}
            className={`chord-option${selectedId === voicing.id ? ' active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(voicing)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(voicing);
              }
            }}
          >
            <ChordDiagram voicing={voicing} compact />
            <div className="chord-option__meta">
              <strong>
                {voicing.root}
                {voicing.chordKind}
              </strong>
              {voicing.name && <span>{voicing.name}</span>}
            </div>
            <div className="chord-option__actions">
              <button
                type="button"
                className="ghost"
                onClick={(event) => {
                  event.stopPropagation();
                  onPlay(voicing);
                }}
              >
                Play
              </button>
            </div>
          </div>
        ))}
        {!voicings.length && <p className="muted">No voicings available for this chord.</p>}
      </div>
    </div>
  );
}
