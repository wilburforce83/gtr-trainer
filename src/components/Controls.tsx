import type { ScaleDef } from '../scales';

export interface ControlsProps {
  tunings: { id: string; label: string }[];
  tuningId: string;
  onTuningChange: (id: string) => void;
  keys: string[];
  keyName: string;
  onKeyChange: (key: string) => void;
  scales: ScaleDef[];
  scaleId: string;
  onScaleChange: (id: string) => void;
  positionIndex: number;
  positionCount: number;
  onPositionChange: (index: number) => void;
  bpm: number;
  onBpmChange: (value: number) => void;
  onPlay: () => void;
  onStop: () => void;
  isPlaying: boolean;
  loop: boolean;
  onLoopToggle: (state: boolean) => void;
  metronome: boolean;
  onMetronomeToggle: (state: boolean) => void;
  onRelativeToggle: () => void;
  canFlipRelative: boolean;
}

export function Controls(props: ControlsProps) {
  const {
    tunings,
    tuningId,
    onTuningChange,
    keys,
    keyName,
    onKeyChange,
    scales,
    scaleId,
    onScaleChange,
    positionIndex,
    positionCount,
    onPositionChange,
    bpm,
    onBpmChange,
    onPlay,
    onStop,
    isPlaying,
    loop,
    onLoopToggle,
    metronome,
    onMetronomeToggle,
    onRelativeToggle,
    canFlipRelative,
  } = props;

  return (
    <section className="controls">
      <div className="control-row primary">
        <label>
          Tuning
          <select value={tuningId} onChange={(event) => onTuningChange(event.target.value)}>
            {tunings.map((tuning) => (
              <option key={tuning.id} value={tuning.id}>
                {tuning.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Key
          <select value={keyName} onChange={(event) => onKeyChange(event.target.value)}>
            {keys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>
        <div className="scale-selector">
          <label>
            Scale
            <select value={scaleId} onChange={(event) => onScaleChange(event.target.value)}>
              {scales.map((scale) => (
                <option key={scale.id} value={scale.id}>
                  {scale.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={onRelativeToggle} disabled={!canFlipRelative}>
            Relative
          </button>
        </div>
      </div>

      <div className="control-row positions">
        <span>Position</span>
        <div className="position-radios">
          {Array.from({ length: positionCount }, (_, idx) => (
            <label key={`pos-${idx}`}>
              <input
                type="radio"
                checked={positionIndex === idx}
                onChange={() => onPositionChange(idx)}
                name="position"
              />
              {idx + 1}
            </label>
          ))}
        </div>
      </div>

      <div className="control-row transport">
        <label>
          BPM
          <input
            type="number"
            min={40}
            max={220}
            value={bpm}
            onChange={(event) => onBpmChange(Number(event.target.value) || 40)}
          />
        </label>
        <button type="button" onClick={isPlaying ? onStop : onPlay} className="primary">
          {isPlaying ? 'Stop' : 'Play'}
        </button>
        {isPlaying && (
          <button type="button" onClick={onStop}>
            Reset
          </button>
        )}
        <label className="toggle">
          <input type="checkbox" checked={loop} onChange={(event) => onLoopToggle(event.target.checked)} /> Loop
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={metronome}
            onChange={(event) => onMetronomeToggle(event.target.checked)}
          />
          Metronome
        </label>
      </div>
    </section>
  );
}

export default Controls;
