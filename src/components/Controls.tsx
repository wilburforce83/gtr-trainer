import type { ScaleDef } from '../scales';

export interface ControlsProps {
  instruments: Array<{ id: string; label: string }>;
  instrumentId: string;
  onInstrumentChange: (id: string) => void;
  tuningOptions: Array<{ id: string; label: string }>;
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
  onRelativeToggle: () => void;
  canFlipRelative: boolean;
}

export function Controls({
  instruments,
  instrumentId,
  onInstrumentChange,
  tuningOptions,
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
  onRelativeToggle,
  canFlipRelative,
}: ControlsProps) {

  return (
    <section className="controls">
      <div className="control-row primary">
        <label>
          Instrument
          <select value={instrumentId} onChange={(event) => onInstrumentChange(event.target.value)}>
            {instruments.map((instrument) => (
              <option key={instrument.id} value={instrument.id}>
                {instrument.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tuning
          <select value={tuningId} onChange={(event) => onTuningChange(event.target.value)}>
            {tuningOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
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
        <div className="position-buttons">
          {Array.from({ length: positionCount }, (_, idx) => (
            <button
              type="button"
              key={`pos-${idx}`}
              className={positionIndex === idx ? 'active' : ''}
              onClick={() => onPositionChange(idx)}
            >
              {idx + 1}
            </button>
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
        <button
          type="button"
          className={`loop-toggle${loop ? ' active' : ''}`}
          onClick={() => onLoopToggle(!loop)}
          aria-pressed={loop}
          aria-label={`Loop ${loop ? 'enabled' : 'disabled'}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M17 5H7a4 4 0 00-4 4v1a1 1 0 102 0V9a2 2 0 012-2h8.59l-1.3 1.29a1 1 0 101.42 1.42l3.7-3.71a1 1 0 000-1.42L15.71 1.86a1 1 0 10-1.42 1.41L15.59 4H17zm-10 9h10a4 4 0 004-4v-1a1 1 0 10-2 0V10a2 2 0 01-2 2H8.41l1.3-1.29a1 1 0 10-1.42-1.42l-3.7 3.71a1 1 0 000 1.42l3.7 3.71a1 1 0 101.42-1.41L8.41 14H7z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
    </section>
  );
}

export default Controls;
