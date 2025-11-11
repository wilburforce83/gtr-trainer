interface Props {
  onExportFretboard: (format: 'svg' | 'png') => void;
  onExportTab: (format: 'svg' | 'png') => void;
}

export function Toolbar({ onExportFretboard, onExportTab }: Props) {
  return (
    <div className="toolbar">
      <div>
        <span>Fretboard</span>
        <button type="button" onClick={() => onExportFretboard('svg')}>
          Export SVG
        </button>
        <button type="button" onClick={() => onExportFretboard('png')}>
          Export PNG
        </button>
      </div>
      <div>
        <span>TAB</span>
        <button type="button" onClick={() => onExportTab('svg')}>
          Export SVG
        </button>
        <button type="button" onClick={() => onExportTab('png')}>
          Export PNG
        </button>
      </div>
    </div>
  );
}

export default Toolbar;
