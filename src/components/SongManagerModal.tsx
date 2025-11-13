import { useEffect, useMemo, useState } from 'react';
import type { HarmonyCell, ModeName, StyleName } from '../chords/types';
import type { DrumPattern, DrumMixerSettings } from '../drums/types';

const STORAGE_KEY = 'gtr-song-saves-v1';

export type SongPayload = {
  keyName: string;
  scaleId: ModeName;
  style: StyleName;
  bpm: number;
  loop: boolean;
  cells: HarmonyCell[];
  drumsEnabled: boolean;
  drumPatternIndex: number;
  drumPattern?: DrumPattern | null;
  mixer: DrumMixerSettings;
};

export type SavedSong = {
  id: string;
  name: string;
  createdAt: number;
  payload: SongPayload;
  preview?: string;
};

interface Props {
  open: boolean;
  onClose(): void;
  current: SongPayload;
  onLoad(payload: SongPayload): void;
}

export default function SongManagerModal({ open, onClose, current, onLoad }: Props) {
  const [songs, setSongs] = useState<SavedSong[]>([]);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const sortedSongs = useMemo(() => songs.slice().sort((a, b) => b.createdAt - a.createdAt), [songs]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed: SavedSong[] = JSON.parse(raw);
        setSongs(parsed);
      } catch {
        setSongs([]);
      }
    } else {
      setSongs([]);
    }
  }, [open]);

  const persistSongs = (next: SavedSong[]) => {
    setSongs(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      return;
    }
    setIsSaving(true);
    const preview = await renderProgressionPreview(current.cells);
    const record: SavedSong = {
      id: crypto.randomUUID(),
      name: name.trim(),
      createdAt: Date.now(),
      payload: current,
      preview,
    };
    persistSongs([...songs, record]);
    setName('');
    setIsSaving(false);
  };

  const handleDelete = (id: string) => {
    persistSongs(songs.filter((song) => song.id !== id));
  };

  const handleDownload = (song: SavedSong) => {
    const blob = new Blob([JSON.stringify(song, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${slugify(song.name)}.gtl`);
  };

  const handleFileImport = async (file: File | null) => {
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const imported: SavedSong | { payload: SongPayload; name?: string } = JSON.parse(text);
      if ('payload' in imported) {
        const record: SavedSong = {
          id: crypto.randomUUID(),
          name: imported.name ?? file.name.replace(/\.gtl$/i, ''),
          createdAt: Date.now(),
          payload: imported.payload ?? (imported as SavedSong).payload,
          preview: (imported as SavedSong).preview,
        };
        persistSongs([...songs, record]);
      }
    } catch {
      // ignore malformed files
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="song-modal-backdrop" role="dialog" aria-modal="true">
      <div className="song-modal">
        <header>
          <h3>Song Library</h3>
          <button type="button" className="ghost" onClick={onClose} aria-label="Close song manager">
            ✕
          </button>
        </header>
        <div className="song-save-form">
          <input
            type="text"
            placeholder="Song name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button type="button" onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? 'Saving…' : 'Save current'}
          </button>
        </div>
        <div className="song-list">
          {sortedSongs.map((song) => (
            <article key={song.id}>
              <div className="song-list__meta">
                <strong>{song.name}</strong>
                <span>{new Date(song.createdAt).toLocaleString()}</span>
              </div>
              {song.preview && <img src={song.preview} alt={song.name} />}
              <div className="song-list__actions">
                <button type="button" onClick={() => onLoad(song.payload)}>Load</button>
                <button type="button" onClick={() => handleDownload(song)}>Download</button>
                <button type="button" onClick={() => handleDelete(song.id)}>Delete</button>
              </div>
            </article>
          ))}
          {!sortedSongs.length && <p className="muted">No saved songs yet.</p>}
        </div>
        <footer className="song-modal__footer">
          <label className="song-file-picker">
            Import .gtl
            <input type="file" accept=".gtl,application/json" onChange={(event) => handleFileImport(event.target.files?.[0] ?? null)} />
          </label>
        </footer>
      </div>
    </div>
  );
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderProgressionPreview(cells: HarmonyCell[]): Promise<string> {
  const width = 640;
  const height = 180;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return Promise.resolve('');
  }
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, width, height);
  const cols = Math.max(1, cells.length);
  const cellWidth = width / cols;
  ctx.font = '16px "Inter"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  cells.forEach((cell, index) => {
    const x = index * cellWidth;
    ctx.fillStyle = 'rgba(56,189,248,0.08)';
    ctx.strokeStyle = 'rgba(56,189,248,0.3)';
    ctx.lineWidth = 1;
    roundRect(ctx, x + 6, 20, cellWidth - 12, height - 40, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(cell.roman ?? '—', x + cellWidth / 2, 70);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(cell.symbol ?? 'Rest', x + cellWidth / 2, 120);
  });
  return Promise.resolve(canvas.toDataURL('image/jpeg', 0.85));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}
