type Props = {
  onExportJSON(): void;
  onExportMIDI(): void;
  onExportPNG(): void;
};

export default function ExportBar({ onExportJSON, onExportMIDI, onExportPNG }: Props) {
  return (
    <div className="export-bar">
      <span>Export</span>
      <button type="button" onClick={onExportJSON}>
        JSON
      </button>
      <button type="button" onClick={onExportMIDI}>
        MIDI
      </button>
      <button type="button" onClick={onExportPNG}>
        PNG
      </button>
    </div>
  );
}
