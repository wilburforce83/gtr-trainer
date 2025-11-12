import type { Voicing } from '../chords/voicings';
import ChordDiagram from './ChordDiagram';

type Props = {
  voicings: Voicing[];
  selectedId?: string;
  arpeggioMode: 'arpeggio' | 'strum' | 'picked';
  onSelect(voicing: Voicing): void;
  onPlay(voicing: Voicing): void;
  onModeChange(mode: 'arpeggio' | 'strum' | 'picked'): void;
};

export default function ChordList({ voicings, selectedId, arpeggioMode, onSelect, onPlay, onModeChange }: Props) {
  return (
    <div className="chord-list">
      <header>
        <span>Voicings</span>
        <div className="mode-toggle">
          {['arpeggio', 'strum', 'picked'].map((mode) => (
            <label key={mode} className="radio">
              <input type="radio" checked={arpeggioMode === mode} onChange={() => onModeChange(mode as any)} />
              {mode}
            </label>
          ))}
        </div>
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
