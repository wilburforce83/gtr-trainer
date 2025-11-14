import type { DrumMixerSettings } from '../drums/types';
import { DEFAULT_DRUM_MIXER, clampMixerValue } from '../drums/types';

type Props = {
  open: boolean;
  settings: DrumMixerSettings;
  onChange(next: DrumMixerSettings): void;
  onClose(): void;
};

const CHANNELS: Array<{ key: keyof DrumMixerSettings; label: string }> = [
  { key: 'instrument', label: 'Instrument' },
  { key: 'bass', label: 'Bass' },
  { key: 'drumBus', label: 'Drum Bus' },
  { key: 'kick', label: 'Kick' },
  { key: 'snare', label: 'Snare/Rim' },
  { key: 'hats', label: 'Hats' },
  { key: 'percussion', label: 'Percussion' },
];

export default function MixerModal({ open, settings, onChange, onClose }: Props) {
  if (!open) {
    return null;
  }

  const handleSliderChange = (channel: keyof DrumMixerSettings, value: number) => {
    onChange({
      ...settings,
      [channel]: clampMixerValue(value),
    });
  };

  const handleReset = () => {
    onChange({ ...DEFAULT_DRUM_MIXER });
  };

  return (
    <div className="song-modal-backdrop" role="dialog" aria-modal="true">
      <div className="song-modal mixer-modal">
        <header>
          <h3>Quick Mixer</h3>
          <button type="button" className="ghost" onClick={onClose} aria-label="Close mixer">
            ✕
          </button>
        </header>
        <div className="mixer-grid">
          {CHANNELS.map((channel) => (
            <div key={channel.key} className="mixer-channel">
              <span className="mixer-channel__label">{channel.label}</span>
              <div className="mixer-slider-vertical">
                <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={settings[channel.key]}
                aria-label={`${channel.label} level`}
                onChange={(event) => handleSliderChange(channel.key, Number(event.target.value))}
              />
              </div>
              <span className="mixer-channel__value">{Math.round(settings[channel.key] * 100)}%</span>
            </div>
          ))}
        </div>
        <footer className="mixer-footer">
          <button type="button" onClick={handleReset}>
            Reset
          </button>
        </footer>
      </div>
    </div>
  );
}
