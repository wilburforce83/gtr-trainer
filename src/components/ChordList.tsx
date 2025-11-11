import type { Voicing } from '../chords/voicings';
import ChordDiagram from './ChordDiagram';

type Props = {
  voicings: Voicing[];
  selectedId?: string;
  arpeggiate: boolean;
  onToggleArpeggiate(value: boolean): void;
  onSelect(voicing: Voicing): void;
  onPlay(voicing: Voicing): void;
};

export default function ChordList({
  voicings,
  selectedId,
  arpeggiate,
  onToggleArpeggiate,
  onSelect,
  onPlay,
}: Props) {
  return (
    <div className="chord-list">
      <header>
        <span>Voicings</span>
        <label className="toggle">
          <input type="checkbox" checked={arpeggiate} onChange={(event) => onToggleArpeggiate(event.target.checked)} />
          {arpeggiate ? 'Arpeggiate' : 'Strum'}
        </label>
      </header>
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
