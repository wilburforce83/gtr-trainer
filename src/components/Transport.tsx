type StrumMode = 'arpeggio' | 'strum' | 'picked';

type Props = {
  loop: boolean;
  isPlaying: boolean;
  onPlay(): void;
  onStop(): void;
  onToggleLoop(value: boolean): void;
  mode: StrumMode;
  onModeChange(mode: StrumMode): void;
  reverb: number;
  tone: number;
  tape: number;
  onReverbChange(value: number): void;
  onToneChange(value: number): void;
  onTapeChange(value: number): void;
  ampProfiles: Array<{ id: string; label: string }>;
  ampId: string;
  onAmpChange(id: string): void;
  instrument: string;
  instrumentOptions: Array<{ id: string; label: string }>;
  onInstrumentChange(id: string): void;
  showOctaveShift: boolean;
  octaveShift: number;
  octaveShiftOptions: number[];
  onOctaveShiftChange(value: number): void;
  drumPatternIndex: number;
  drumPatternOptions: Array<{ value: number; label: string }>;
  onDrumPatternChange(value: number): void;
  onOpenMixer(): void;
};

const MODE_OPTIONS: StrumMode[] = ['arpeggio', 'strum', 'picked'];

export default function Transport({
  loop,
  isPlaying,
  onPlay,
  onStop,
  onToggleLoop,
  mode,
  onModeChange,
  reverb,
  tone,
  tape,
  onReverbChange,
  onToneChange,
  onTapeChange,
  ampProfiles,
  ampId,
  onAmpChange,
  instrument,
  instrumentOptions,
  onInstrumentChange,
  showOctaveShift,
  octaveShift,
  octaveShiftOptions,
  onOctaveShiftChange,
  drumPatternIndex,
  drumPatternOptions,
  onDrumPatternChange,
  onOpenMixer,
}: Props) {
  return (
    <div className="transport-bar">
      <div className="transport-header">
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
          <label className="toggle-vertical">
            Loop
            <input type="checkbox" checked={loop} onChange={(event) => onToggleLoop(event.target.checked)} />
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
          <div className="transport-line">
            <label>
              Amp
              <select value={ampId} onChange={(event) => onAmpChange(event.target.value)}>
                {ampProfiles.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="ghost" onClick={onOpenMixer} aria-label="Open mixer">
              🎚️
            </button>
          </div>
          <div className="transport-line">
            <label>
              Instrument
              <select value={instrument} onChange={(event) => onInstrumentChange(event.target.value)}>
                {instrumentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Drums
              <select value={String(drumPatternIndex)} onChange={(event) => onDrumPatternChange(Number(event.target.value))}>
                {drumPatternOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {showOctaveShift && (
            <label>
              Octave
              <select value={octaveShift} onChange={(event) => onOctaveShiftChange(Number(event.target.value))}>
                {octaveShiftOptions.map((option) => (
                  <option key={option} value={option}>
                    {option > 0 ? `+${option}` : option}
                  </option>
                ))}
              </select>
            </label>
          )}
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
