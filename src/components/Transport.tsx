type StrumMode = 'arpeggio' | 'strum' | 'picked';

type Props = {
  bpm: number;
  loop: boolean;
  metronome: boolean;
  isPlaying: boolean;
  onBpmChange(value: number): void;
  onPlay(): void;
  onStop(): void;
  onToggleLoop(value: boolean): void;
  onToggleMetronome(value: boolean): void;
  mode: StrumMode;
  onModeChange(mode: StrumMode): void;
  reverb: number;
  tone: number;
  tape: number;
  onReverbChange(value: number): void;
  onToneChange(value: number): void;
  onTapeChange(value: number): void;
};

const MODE_OPTIONS: StrumMode[] = ['arpeggio', 'strum', 'picked'];

export default function Transport({
  bpm,
  loop,
  metronome,
  isPlaying,
  onBpmChange,
  onPlay,
  onStop,
  onToggleLoop,
  onToggleMetronome,
  mode,
  onModeChange,
  reverb,
  tone,
  tape,
  onReverbChange,
  onToneChange,
  onTapeChange,
}: Props) {
  return (
    <div className="transport-bar">
      <div className="transport-header">
        <label>
          BPM
          <input
            type="number"
            value={bpm}
            min={40}
            max={220}
            onChange={(event) => onBpmChange(Number(event.target.value))}
          />
        </label>
        <div className="transport-actions">
          {!isPlaying && (
            <button type="button" className="primary" onClick={onPlay}>
              Play
            </button>
          )}
          {isPlaying && (
            <button type="button" onClick={onStop}>
              Stop
            </button>
          )}
          <label className="toggle">
            <input type="checkbox" checked={loop} onChange={(event) => onToggleLoop(event.target.checked)} />
            Loop
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={metronome}
              onChange={(event) => onToggleMetronome(event.target.checked)}
            />
            Metronome
          </label>
          <label>
            Style
            <select value={mode} onChange={(event) => onModeChange(event.target.value as StrumMode)}>
              {MODE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="transport-effects">
        <label className="effect-slider">
          <span>
            Reverb <strong>{Math.round(reverb * 100)}%</strong>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={reverb}
            onChange={(event) => onReverbChange(Number(event.target.value))}
          />
        </label>
        <label className="effect-slider">
          <span>
            Tone <strong>{Math.round(tone * 100)}%</strong>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={tone}
            onChange={(event) => onToneChange(Number(event.target.value))}
          />
        </label>
        <label className="effect-slider">
          <span>
            Tape <strong>{Math.round(tape * 100)}%</strong>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={tape}
            onChange={(event) => onTapeChange(Number(event.target.value))}
          />
        </label>
      </div>
    </div>
  );
}
