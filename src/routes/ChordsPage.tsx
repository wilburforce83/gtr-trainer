import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chord, Note } from '@tonaljs/tonal';
import BackButton from '../components/BackButton';
import ProgressionEditor from '../components/ProgressionEditor';
import ChordList from '../components/ChordList';
import Transport from '../components/Transport';
import {
  generateProgression,
  reharmonizeCell as reharmonizeHarmonyCell,
} from '../chords/harmony';
import type { HarmonyCell, ModeName, StyleName } from '../chords/types';
import type { Voicing } from '../chords/voicings';
import { chooseVoicing, getVoicingsForSymbol } from '../chords/voicings';
import {
  playChord,
  playProgression,
  stopPlayback,
  setTransportBpm,
  setMetronomeEnabled,
  primeChordAudioUnlock,
  setReverbAmount as applyReverbAmount,
  setToneAmount as applyToneAmount,
  setTapeAmount as applyTapeAmount,
  DEFAULT_EFFECT_SETTINGS,
} from '../chords/audio';
import { STANDARD_TUNING, tuningToMidi, buildNeckMarkers } from '../lib/neck';
import { buildPositions } from '../lib/positions';
import { renderChordDiagram } from '../chords/svguitar';
import FretboardView from '../components/FretboardView';
import { getScaleById } from '../scales';

const STORAGE_KEY = 'gtr-chords-state-v1';
const RESOLUTION = '1/2';
const KEY_OPTIONS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const MODE_OPTIONS: Array<{ value: ModeName; label: string }> = [
  { value: 'ionian', label: 'Major / Ionian' },
  { value: 'aeolian', label: 'Natural Minor / Aeolian' },
  { value: 'dorian', label: 'Dorian' },
  { value: 'melodic minor', label: 'Melodic Minor' },
  { value: 'harmonic minor', label: 'Harmonic Minor' },
  { value: 'mixolydian', label: 'Mixolydian' },
];
const STYLE_OPTIONS: Array<{ value: StyleName; label: string }> = [
  { value: 'neo-soul', label: 'Neo-soul' },
  { value: 'lofi', label: 'Lo-fi' },
  { value: 'pop', label: 'Pop' },
  { value: 'blues', label: 'Blues' },
];

type PanelTab = 'voicings' | 'alt' | 'info';

const tuningMidi = tuningToMidi(STANDARD_TUNING);
const CELLS_PER_BAR = 2;
const { reverb: DEFAULT_REVERB, tone: DEFAULT_TONE, tape: DEFAULT_TAPE } = DEFAULT_EFFECT_SETTINGS;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const readEffectValue = (value: unknown, fallback: number) => (typeof value === 'number' ? clamp01(value) : fallback);

const MODE_TO_SCALE_ID: Partial<Record<ModeName, string>> = {
  ionian: 'ionian',
  aeolian: 'aeolian',
  dorian: 'dorian',
  'melodic minor': 'melodicMinor',
  'harmonic minor': 'harmonicMinor',
  mixolydian: 'mixolydian',
};

function buildEmptyProgression(barCount: number): HarmonyCell[] {
  const totalCells = barCount * CELLS_PER_BAR;
  return Array.from({ length: totalCells }, (_, index) => ({
    index,
    roman: '—',
    symbol: 'Rest',
    func: 'T',
    locked: false,
  }));
}

export default function ChordsPage() {
  const [keyName, setKeyName] = useState('C');
  const [mode, setMode] = useState<ModeName>('ionian');
  const [style, setStyle] = useState<StyleName>('neo-soul');
  const bars = 4;
  const [cells, setCells] = useState<HarmonyCell[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [bpm, setBpm] = useState(84);
  const [loop, setLoop] = useState(false);
  const [metronome, setMetronome] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [arpeggioMode, setArpeggioMode] = useState<'arpeggio' | 'strum' | 'picked'>('arpeggio');
  const [panelTab, setPanelTab] = useState<PanelTab>('voicings');
  const [reverbAmount, setReverbAmountState] = useState(DEFAULT_REVERB);
  const [toneAmount, setToneAmountState] = useState(DEFAULT_TONE);
  const [tapeAmount, setTapeAmountState] = useState(DEFAULT_TAPE);
  const [scalePositionIndex, setScalePositionIndex] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setKeyName(parsed.keyName ?? 'C');
      setMode(parsed.mode ?? 'ionian');
      setStyle(parsed.style ?? 'neo-soul');
      setBpm(parsed.bpm ?? 84);
      setLoop(parsed.loop ?? false);
      setMetronome(parsed.metronome ?? false);
      const effects = parsed.effects ?? {};
      setReverbAmountState(readEffectValue(effects.reverb, DEFAULT_REVERB));
      setToneAmountState(readEffectValue(effects.tone, DEFAULT_TONE));
      setTapeAmountState(readEffectValue(effects.tape, DEFAULT_TAPE));
      if (Array.isArray(parsed.cells)) {
        setCells(parsed.cells);
      }
    } catch {
      // ignore corrupted cache
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const payload = {
      keyName,
      mode,
      style,
      bars,
      bpm,
      loop,
      metronome,
      cells,
      effects: {
        reverb: reverbAmount,
        tone: toneAmount,
        tape: tapeAmount,
      },
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [keyName, mode, style, bars, bpm, loop, metronome, cells, reverbAmount, toneAmount, tapeAmount]);

  const applyVoicings = useCallback((draft: HarmonyCell[]): HarmonyCell[] => {
    let prev: Voicing | undefined;
    return draft.map((cell) => {
      const options = getVoicingsForSymbol(cell.symbol);
      if (!options.length) {
        return { ...cell, voicing: undefined };
      }
      const choice = chooseVoicing(prev, options);
      prev = choice;
      return { ...cell, voicing: choice };
    });
  }, []);

  const cellsRef = useRef<HarmonyCell[]>(cells);

  useEffect(() => {
    cellsRef.current = cells;
  }, [cells]);

  const handleGenerate = useCallback(
    (preserveLocks = true) => {
      const lockedMap = preserveLocks
        ? Object.fromEntries(cellsRef.current.filter((cell) => cell.locked).map((cell) => [cell.index, cell]))
        : {};
      const next = generateProgression({
        key: keyName,
        mode,
        style,
        bars,
        resolution: RESOLUTION,
        lockedMap,
      });
      const withVoicings = applyVoicings(next);
      setCells(withVoicings);
      setSelectedIndex(withVoicings[0]?.index ?? null);
    },
    [applyVoicings, keyName, mode, style, bars],
  );

  useEffect(() => {
    if (!cells.length) {
      handleGenerate(false);
    }
  }, [cells.length, handleGenerate]);

  useEffect(() => {
    stopPlayback();
    setIsPlaying(false);
    // regenerate grid to match bar count
    handleGenerate();
  }, [bars, handleGenerate]);

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  useEffect(() => {
    primeChordAudioUnlock();
  }, []);

  useEffect(() => {
    applyReverbAmount(reverbAmount);
  }, [reverbAmount]);

  useEffect(() => {
    applyToneAmount(toneAmount);
  }, [toneAmount]);

  useEffect(() => {
    applyTapeAmount(tapeAmount);
  }, [tapeAmount]);

  const selectedCell = cells.find((cell) => cell.index === selectedIndex) ?? cells[0];
  const voicingOptions = useMemo(() => {
    if (!selectedCell) {
      return [];
    }
    return getVoicingsForSymbol(selectedCell.symbol);
  }, [selectedCell]);

  const scaleDef = useMemo(() => getScaleById(MODE_TO_SCALE_ID[mode] ?? 'minorPentatonic'), [mode]);
  const scalePositions = useMemo(
    () => buildPositions({ key: keyName, scale: scaleDef, tuningMidi }),
    [keyName, scaleDef],
  );

  useEffect(() => {
    if (scalePositionIndex >= scalePositions.length) {
      setScalePositionIndex(0);
    }
  }, [scalePositions.length, scalePositionIndex]);

  const activeScalePosition = scalePositions[scalePositionIndex];

  const scaleMarkers = useMemo(
    () =>
      buildNeckMarkers({
        key: keyName,
        scale: scaleDef,
        tuning: STANDARD_TUNING,
        highlighted: activeScalePosition?.idSet,
      }),
    [keyName, scaleDef, activeScalePosition],
  );
  const scaleHighlightIds = activeScalePosition?.idSet ?? new Set<string>();

  const handleSelectCell = (index: number) => {
    setSelectedIndex(index);
    const cell = cells.find((candidate) => candidate.index === index);
    if (cell?.voicing) {
      playChord(cell.voicing, { mode: arpeggioMode });
    }
  };

  const handleToggleLock = (index: number) => {
    setCells((prev) =>
      prev.map((cell) => (cell.index === index ? { ...cell, locked: !cell.locked } : cell)),
    );
  };

  const handleReharmonize = (index: number) => {
    setCells((prev) =>
      applyVoicings(
        prev.map((cell) => {
          if (cell.index !== index) {
            return cell;
          }
          const updated = reharmonizeHarmonyCell(cell, { key: keyName, mode, style });
          return { ...updated, locked: cell.locked };
        }),
      ),
    );
  };

  const handleDelete = (index: number) => {
    setCells((prev) =>
      prev.map((cell) => (cell.index === index ? { ...cell, roman: '—', symbol: 'Rest', voicing: undefined, locked: false } : cell)),
    );
  };

  const handleSelectVoicing = (voicing: Voicing) => {
    setCells((prev) =>
      prev.map((cell) => (cell.index === selectedCell?.index ? { ...cell, voicing } : cell)),
    );
    if (selectedCell) {
      playChord(voicing, { mode: arpeggioMode });
    }
  };

  const handleAltChord = (symbol: string) => {
    if (!selectedCell) {
      return;
    }
    setCells((prev) =>
      applyVoicings(
        prev.map((cell) => (cell.index === selectedCell.index ? { ...cell, symbol } : cell)),
      ),
    );
  };

  const handleHumanize = () => {
    setCells((prev) => applyVoicings(humanizeProgression(prev)));
  };

  const handleQuantize = () => {
    setCells((prev) => quantizeProgression(prev));
  };

  const handleMoveCell = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) {
      return;
    }
    setCells((prev) => {
      const next = [...prev];
      const fromPos = next.findIndex((cell) => cell.index === fromIndex);
      const toPos = next.findIndex((cell) => cell.index === toIndex);
      if (fromPos === -1 || toPos === -1) {
        return prev;
      }
      const [moved] = next.splice(fromPos, 1);
      next.splice(toPos, 0, moved);
      return next.map((cell, idx) => ({ ...cell, index: idx }));
    });
    setSelectedIndex((current) => {
      if (current === null) {
        return current;
      }
      if (current === fromIndex) {
        return toIndex;
      }
      if (fromIndex < current && current <= toIndex) {
        return current - 1;
      }
      if (toIndex <= current && current < fromIndex) {
        return current + 1;
      }
      return current;
    });
  };

  const handleClear = () => {
    stopPlayback();
    setIsPlaying(false);
    const empty = buildEmptyProgression(bars);
    setCells(empty);
    setSelectedIndex(empty[0]?.index ?? null);
  };

  const handlePlay = async () => {
    if (!cells.length) {
      return;
    }
    const tempoReady = await setTransportBpm(bpm);
    const metroReady = await setMetronomeEnabled(metronome);
    if (!tempoReady || !metroReady) {
      return;
    }
    const started = await playProgression(cells, loop, { mode: arpeggioMode });
    setIsPlaying(started);
  };

  const handleStop = () => {
    stopPlayback();
    setIsPlaying(false);
  };

  const handleToggleMetronome = async (value: boolean) => {
    setMetronome(value);
    await setMetronomeEnabled(value);
  };

  const handleReverbChange = (value: number) => {
    setReverbAmountState(clamp01(value));
  };

  const handleToneChange = (value: number) => {
    setToneAmountState(clamp01(value));
  };

  const handleTapeChange = (value: number) => {
    setTapeAmountState(clamp01(value));
  };

  const altChords = selectedCell ? buildAltChords(selectedCell.symbol) : [];

  return (
    <div className="chords-shell">
      <header className="page-header">
        <BackButton />
        <div className="page-heading">
          <p className="eyebrow">Chord Progressions</p>
          <p className="page-title">Generate genre-aware progressions with adaptive voicings.</p>
        </div>
      </header>

      <section className="chords-controls">
        <div className="controls-left">
          <label>
            Key
            <select value={keyName} onChange={(event) => setKeyName(event.target.value)}>
              {KEY_OPTIONS.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </label>
          <label>
            Mode
            <select value={mode} onChange={(event) => setMode(event.target.value as ModeName)}>
              {MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Style
            <select value={style} onChange={(event) => setStyle(event.target.value as StyleName)}>
              {STYLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="controls-right">
          <div className="control-buttons primary-actions">
            <button type="button" className="primary" onClick={() => handleGenerate(true)}>
              Generate
            </button>
            <button type="button" onClick={handleClear}>
              Clear
            </button>
            <button type="button" onClick={handleHumanize}>
              Humanize
            </button>
            <button type="button" onClick={handleQuantize}>
              Quantize
            </button>
          </div>
          <div className="control-buttons export-actions">
            <span className="export-label">Export</span>
            <button
              type="button"
              onClick={() =>
                exportProgressionJson({
                  key: keyName,
                  mode,
                  style,
                  bpm,
                  cells,
                })
              }
            >
              JSON
            </button>
            <button type="button" onClick={() => exportProgressionMidi(cells, bpm)}>MIDI</button>
            <button type="button" onClick={() => exportProgressionPng(cells)}>PNG</button>
          </div>
        </div>
      </section>

      <div className="chords-main">
        <section className="chords-workspace">
          <div className="progression-pane">
          <ProgressionEditor
            cells={cells}
            bars={bars}
            selectedIndex={selectedIndex}
            onSelect={handleSelectCell}
            onToggleLock={handleToggleLock}
            onReharmonize={handleReharmonize}
            onDelete={handleDelete}
            onMove={handleMoveCell}
          />
          </div>
        </section>

        <section className="chords-lower-grid">
          <div className="scale-pane">
            <div className="scale-pane__header">
              <div>
                <p className="eyebrow">Solo Scale</p>
                <h3>
                  {keyName} · {scaleDef.name}
                </h3>
              </div>
              <div className="scale-position-toggle">
                {scalePositions.length ? (
                  scalePositions.map((_, index) => (
                    <button
                      type="button"
                      key={`scale-pos-${index}`}
                      className={index === scalePositionIndex ? 'active' : ''}
                      onClick={() => setScalePositionIndex(index)}
                    >
                      {index + 1}
                    </button>
                  ))
                ) : (
                  <span className="muted">No positions</span>
                )}
              </div>
            </div>
            <div className="scale-pane__board">
              <FretboardView markers={scaleMarkers} highlightIds={scaleHighlightIds} tuning={STANDARD_TUNING} />
            </div>
          </div>
        <div className="voicing-options">
          <nav className="voicing-tabs">
            <button type="button" className={panelTab === 'voicings' ? 'active' : ''} onClick={() => setPanelTab('voicings')}>
              Voicings
              </button>
              <button type="button" className={panelTab === 'alt' ? 'active' : ''} onClick={() => setPanelTab('alt')}>
                Alt Chords
              </button>
              <button type="button" className={panelTab === 'info' ? 'active' : ''} onClick={() => setPanelTab('info')}>
                Info
              </button>
            </nav>
          {panelTab === 'voicings' && (
            <ChordList
              voicings={voicingOptions}
              selectedId={selectedCell?.voicing?.id}
              onSelect={handleSelectVoicing}
              onPlay={(voicing) => playChord(voicing, { mode: arpeggioMode })}
            />
          )}
            {panelTab === 'alt' && (
              <div className="alt-chord-list">
                {altChords.map((option) => (
                  <button key={option.symbol} type="button" onClick={() => handleAltChord(option.symbol)}>
                    {option.label}
                  </button>
                ))}
                {!altChords.length && <p className="muted">No alternates for this chord.</p>}
              </div>
            )}
            {panelTab === 'info' && selectedCell && (
              <ul className="voicing-info">
                <li>
                  <strong>Function:</strong> {selectedCell.func}
                </li>
                <li>
                  <strong>Locked:</strong> {selectedCell.locked ? 'Yes' : 'No'}
                </li>
                <li>
                  <strong>Voicing:</strong> {selectedCell.voicing ? `${selectedCell.voicing.root}${selectedCell.voicing.chordKind}` : '—'}
                </li>
              </ul>
            )}
          </div>
          <div className="transport-pane">
            <Transport
              bpm={bpm}
              loop={loop}
              metronome={metronome}
              isPlaying={isPlaying}
              onBpmChange={setBpm}
              onPlay={handlePlay}
              onStop={handleStop}
              onToggleLoop={setLoop}
              onToggleMetronome={handleToggleMetronome}
              mode={arpeggioMode}
              onModeChange={setArpeggioMode}
              reverb={reverbAmount}
              tone={toneAmount}
              tape={tapeAmount}
              onReverbChange={handleReverbChange}
              onToneChange={handleToneChange}
              onTapeChange={handleTapeChange}
            />
          </div>
        </section>

      </div>
    </div>
  );
}

function humanizeProgression(cells: HarmonyCell[]): HarmonyCell[] {
  const colors = ['add9', '6/9', 'sus2', 'sus4', 'maj9', 'm9', '9sus4'];
  return cells.map((cell) => {
    if (cell.symbol === 'Rest' || Math.random() > 0.35) {
      return cell;
    }
    const root = extractRoot(cell.symbol);
    if (!root) {
      return cell;
    }
    const choice = colors[Math.floor(Math.random() * colors.length)];
    return { ...cell, symbol: `${root}${choice}` };
  });
}

function quantizeProgression(cells: HarmonyCell[]): HarmonyCell[] {
  return cells
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((cell, index) => ({ ...cell, index }));
}

function buildAltChords(symbol: string): Array<{ label: string; symbol: string }> {
  const root = extractRoot(symbol);
  if (!root) {
    return [];
  }
  const variations = ['sus2', 'sus4', 'add9', '6/9', 'maj9#11', '9'];
  return variations.map((variant) => ({
    label: `${root}${variant}`,
    symbol: `${root}${variant}`,
  }));
}

function extractRoot(symbol: string): string | null {
  const match = symbol.match(/^([A-G][b#]?)/i);
  return match ? match[1] : null;
}

function exportProgressionJson(payload: { key: string; mode: string; style: string; bpm: number; cells: HarmonyCell[] }) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'progression.json');
}

function exportProgressionMidi(cells: HarmonyCell[], bpm: number) {
  if (!cells.length) {
    return;
  }
  const PPQ = 480;
  const cellTicks = PPQ * 2;
  const events: Array<{ tick: number; bytes: number[] }> = [];
  let tick = 0;
  cells.forEach((cell) => {
    const notes = voicingToMidi(cell) ?? chordToMidi(cell.symbol);
    if (!notes.length) {
      tick += cellTicks;
      return;
    }
    notes.forEach((note) => {
      events.push({ tick, bytes: [0x90, note, 0x60] });
    });
    notes.forEach((note) => {
      events.push({ tick: tick + cellTicks, bytes: [0x80, note, 0x00] });
    });
    tick += cellTicks;
  });
  const tempo = Math.round((60 / bpm) * 1_000_000);
  const trackBytes: number[] = [];
  writeVarLen(0, trackBytes);
  trackBytes.push(0xff, 0x51, 0x03, (tempo >> 16) & 0xff, (tempo >> 8) & 0xff, tempo & 0xff);
  events.sort((a, b) => a.tick - b.tick);
  let lastTick = 0;
  events.forEach((event) => {
    writeVarLen(event.tick - lastTick, trackBytes);
    trackBytes.push(...event.bytes);
    lastTick = event.tick;
  });
  writeVarLen(0, trackBytes);
  trackBytes.push(0xff, 0x2f, 0x00);

  const header = [
    ...stringToBytes('MThd'),
    0x00,
    0x00,
    0x00,
    0x06,
    0x00,
    0x00,
    0x00,
    0x01,
    0x01,
    0xe0,
  ];
  const trackHeader = [...stringToBytes('MTrk'), (trackBytes.length >> 24) & 0xff, (trackBytes.length >> 16) & 0xff, (trackBytes.length >> 8) & 0xff, trackBytes.length & 0xff];
  const midiData = new Uint8Array([...header, ...trackHeader, ...trackBytes]);
  const blob = new Blob([midiData], { type: 'audio/midi' });
  downloadBlob(blob, 'progression.mid');
}

async function exportProgressionPng(cells: HarmonyCell[]) {
  if (typeof document === 'undefined') {
    return;
  }
  const playable = cells.filter((cell) => cell.voicing);
  if (!playable.length) {
    return;
  }
  const widthPerDiagram = 160;
  const height = 220;
  const canvas = document.createElement('canvas');
  canvas.width = playable.length * widthPerDiagram;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  for (let index = 0; index < playable.length; index += 1) {
    const voicing = playable[index].voicing!;
    // render svg to offscreen container
    const temp = document.createElement('div');
    temp.style.position = 'absolute';
    temp.style.left = '-9999px';
    temp.style.width = `${widthPerDiagram}px`;
    document.body.appendChild(temp);
    renderChordDiagram(temp, voicing);
    const svg = temp.querySelector('svg');
    if (svg) {
      const serialized = new XMLSerializer().serializeToString(svg);
      const img = await svgToImage(serialized);
      ctx.drawImage(img, index * widthPerDiagram, 0, widthPerDiagram, height);
    }
    temp.remove();
  }

  canvas.toBlob((blob) => {
    if (blob) {
      downloadBlob(blob, 'progression.png');
    }
  });
}

function svgToImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svg)))}`;
  });
}

function voicingToMidi(cell: HarmonyCell): number[] | null {
  if (!cell.voicing) {
    return null;
  }
  return cell.voicing.strings
    .filter((entry) => entry.fret >= 0)
    .map((entry) => tuningMidi[entry.str - 1] + entry.fret);
}

function chordToMidi(symbol: string): number[] {
  const chord = Chord.get(symbol);
  if (chord.empty) {
    return [];
  }
  return chord.notes
    .map((note, index) => {
      const octave = 3 + Math.floor(index / 3);
      return Note.midi(`${note}${octave}`);
    })
    .filter((midi): midi is number => typeof midi === 'number');
}

function writeVarLen(value: number, buffer: number[]) {
  let bufferValue = value & 0x7f;
  while ((value >>= 7)) {
    bufferValue <<= 8;
    bufferValue |= (value & 0x7f) | 0x80;
  }
  while (true) {
    buffer.push(bufferValue & 0xff);
    if (bufferValue & 0x80) {
      bufferValue >>= 8;
    } else {
      break;
    }
  }
}

function stringToBytes(text: string): number[] {
  return Array.from(text).map((char) => char.charCodeAt(0));
}

function downloadBlob(blob: Blob, filename: string) {
  if (typeof window === 'undefined') {
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
