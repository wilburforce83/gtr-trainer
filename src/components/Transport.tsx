type Props = {
  isPlaying: boolean;
  onPlay(): void;
  onStop(): void;
  arpeggioSpread: number;
  onArpeggioSpreadChange(value: number): void;
  reverb: number;
  tone: number;
  delay: number;
  chorus: number;
  onReverbChange(value: number): void;
  onToneChange(value: number): void;
  onDelayChange(value: number): void;
  onChorusChange(value: number): void;
  ampProfiles: Array<{ id: string; label: string }>;
  ampId: string;
  onAmpChange(id: string): void;
  instrument: string;
  instrumentOptions: Array<{ id: string; label: string }>;
  onInstrumentChange(id: string): void;
  drumPatternIndex: number;
  drumPatternOptions: Array<{ value: number; label: string }>;
  onDrumPatternChange(value: number): void;
  onOpenMixer(): void;
};

export default function Transport({
  isPlaying,
  onPlay,
  onStop,
  arpeggioSpread,
  onArpeggioSpreadChange,
  reverb,
  tone,
  delay,
  chorus,
  onReverbChange,
  onToneChange,
  onDelayChange,
  onChorusChange,
  ampProfiles,
  ampId,
  onAmpChange,
  instrument,
  instrumentOptions,
  onInstrumentChange,
  drumPatternIndex,
  drumPatternOptions,
  onDrumPatternChange,
  onOpenMixer,
}: Props) {
  return (
    <div className="transport-bar">
      <div className="transport-header">
        <div className="transport-actions">
          <div className="transport-primary-row">
            <div className="transport-button-group">
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
              <button type="button" className="ghost transport-mixer-button" onClick={onOpenMixer} aria-label="Open mixer">
                🎚️
              </button>
            </div>
            <label className="transport-field">
              <span>Amp</span>
              <select value={ampId} onChange={(event) => onAmpChange(event.target.value)}>
                {ampProfiles.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="transport-secondary-row">
            <label className="transport-field">
              <span>Instrument</span>
              <select value={instrument} onChange={(event) => onInstrumentChange(event.target.value)}>
                {instrumentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="transport-field">
              <span>Drums</span>
              <select value={String(drumPatternIndex)} onChange={(event) => onDrumPatternChange(Number(event.target.value))}>
                {drumPatternOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>
      <div className="transport-effects">
        <label className="effect-slider">
          <span>
            Arpeggio <strong>{Math.round(arpeggioSpread * 100)}%</strong>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={arpeggioSpread}
            onChange={(event) => onArpeggioSpreadChange(Number(event.target.value))}
          />
        </label>
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
            Delay <strong>{Math.round(delay * 100)}%</strong>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={delay}
            onChange={(event) => onDelayChange(Number(event.target.value))}
          />
        </label>
        <label className="effect-slider">
          <span>
            Chorus <strong>{Math.round(chorus * 100)}%</strong>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={chorus}
            onChange={(event) => onChorusChange(Number(event.target.value))}
          />
        </label>
      </div>
    </div>
  );
}
