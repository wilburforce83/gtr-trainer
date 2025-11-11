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
};

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
}: Props) {
  return (
    <div className="transport-bar">
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
      </div>
    </div>
  );
}
