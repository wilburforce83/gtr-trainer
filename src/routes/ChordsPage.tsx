import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chord, Note } from '@tonaljs/tonal';
import BackButton from '../components/BackButton';
import SupportButton from '../components/SupportButton';
import ProgressionEditor from '../components/ProgressionEditor';
import ChordList from '../components/ChordList';
import Transport from '../components/Transport';
import SongManagerModal, { type SongPayload } from '../components/SongManagerModal';
import {
  generateProgression,
  reharmonizeCell as reharmonizeHarmonyCell,
  humanizeChordCells,
  listGenreDegrees,
  buildChordSymbolForDegree,
  type RomanDegree,
} from '../chords/harmony';
import type { HarmonyCell, ModeName, StyleName } from '../chords/types';
import type { Voicing } from '../chords/voicings';
import { chooseVoicing, getVoicingsForSymbol } from '../chords/voicings';
import {
  playChord,
  playProgression,
  stopPlayback,
  setTransportBpm,
  primeChordAudioUnlock,
  setReverbAmount as applyReverbAmount,
  setToneAmount as applyToneAmount,
  setTapeAmount as applyTapeAmount,
  setAmpProfile as applyAmpProfile,
  setInstrument as applyInstrument,
  setInstrumentOctaveShift as applyInstrumentOctaveShift,
  DEFAULT_EFFECT_SETTINGS,
  AMP_PROFILES,
  INSTRUMENT_OPTIONS,
} from '../chords/audio';
import { renderChordDiagram } from '../chords/svguitar';
import FretboardView from '../components/FretboardView';
import { SCALES, getScaleById, type ScaleDef } from '../scales';
import {
  INSTRUMENTS,
  buildInstrumentScaleData,
  getInstrument,
  getInstrumentTuning,
  type InstrumentId,
} from '../lib/instrumentScales';
import { STANDARD_TUNING, tuningToMidi } from '../lib/neck';

const STORAGE_KEY = 'gtr-chords-state-v1';
const RESOLUTION = '1/2';
const KEY_OPTIONS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const DEFAULT_CHORD_SCALE_ID: ModeName = 'ionian';
const SCALE_OPTIONS: Array<{ value: ModeName; label: string }> = SCALES.map((scale) => ({
  value: scale.id as ModeName,
  label: scale.name,
}));
const STYLE_OPTIONS: Array<{ value: StyleName; label: string }> = [
  { value: 'neo-soul', label: 'Neo-soul' },
  { value: 'lofi', label: 'Lo-fi' },
  { value: 'pop', label: 'Pop' },
  { value: 'blues', label: 'Blues' },
];

type PanelTab = 'voicings' | 'change' | 'alt' | 'info';

const CELLS_PER_BAR = 2;
const { reverb: DEFAULT_REVERB, tone: DEFAULT_TONE, tape: DEFAULT_TAPE } = DEFAULT_EFFECT_SETTINGS;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const readEffectValue = (value: unknown, fallback: number) => (typeof value === 'number' ? clamp01(value) : fallback);
const DEFAULT_PIANO_OCTAVE_SHIFT = -1;
const PIANO_OCTAVE_OPTIONS = [-2, -1, 0, 1, 2];
const clampOctaveShiftValue = (value: number) => {
  if (Number.isNaN(value)) {
    return DEFAULT_PIANO_OCTAVE_SHIFT;
  }
  return Math.min(PIANO_OCTAVE_OPTIONS[PIANO_OCTAVE_OPTIONS.length - 1], Math.max(PIANO_OCTAVE_OPTIONS[0], Math.round(value)));
};

const tuningMidi = tuningToMidi(STANDARD_TUNING);

const DEFAULT_SCALE_POSITION_INDEX = 1;
const DEFAULT_SOLO_INSTRUMENT_ID: InstrumentId = 'guitar';
const DEFAULT_SOLO_TUNING_ID = getInstrument(DEFAULT_SOLO_INSTRUMENT_ID).tunings[0]?.id ?? '';

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
  const [scaleId, setScaleId] = useState<ModeName>(DEFAULT_CHORD_SCALE_ID);
  const [style, setStyle] = useState<StyleName>('neo-soul');
  const bars = 4;
  const [cells, setCells] = useState<HarmonyCell[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [bpm, setBpm] = useState(84);
  const [loop, setLoop] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [arpeggioMode, setArpeggioMode] = useState<'arpeggio' | 'strum' | 'picked'>('arpeggio');
  const [panelTab, setPanelTab] = useState<PanelTab>('voicings');
  const [reverbAmount, setReverbAmountState] = useState(DEFAULT_REVERB);
  const [toneAmount, setToneAmountState] = useState(DEFAULT_TONE);
  const [tapeAmount, setTapeAmountState] = useState(DEFAULT_TAPE);
  const [scalePositionIndex, setScalePositionIndex] = useState(DEFAULT_SCALE_POSITION_INDEX);
  const [soloInstrumentId, setSoloInstrumentId] = useState<InstrumentId>(DEFAULT_SOLO_INSTRUMENT_ID);
  const [soloTuningId, setSoloTuningId] = useState(DEFAULT_SOLO_TUNING_ID);
  const [ampProfileId, setAmpProfileId] = useState(AMP_PROFILES[0].id);
  const [instrumentId, setInstrumentId] = useState(INSTRUMENT_OPTIONS[0].id);
  const [pianoOctaveShift, setPianoOctaveShift] = useState(DEFAULT_PIANO_OCTAVE_SHIFT);
  const [showSongModal, setShowSongModal] = useState(false);

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
      setScaleId((parsed.scaleId ?? parsed.mode ?? DEFAULT_CHORD_SCALE_ID) as ModeName);
      setStyle(parsed.style ?? 'neo-soul');
      setBpm(parsed.bpm ?? 84);
      setLoop(parsed.loop ?? false);
      if (typeof parsed.ampProfileId === 'string') {
        const exists = AMP_PROFILES.some((profile) => profile.id === parsed.ampProfileId);
        setAmpProfileId(exists ? parsed.ampProfileId : AMP_PROFILES[0].id);
      }
      if (typeof parsed.instrumentId === 'string') {
        const exists = INSTRUMENT_OPTIONS.some((option) => option.id === parsed.instrumentId);
        setInstrumentId(exists ? parsed.instrumentId : INSTRUMENT_OPTIONS[0].id);
      }
      if (typeof parsed.pianoOctaveShift === 'number') {
        setPianoOctaveShift(clampOctaveShiftValue(parsed.pianoOctaveShift));
      } else {
        setPianoOctaveShift(DEFAULT_PIANO_OCTAVE_SHIFT);
      }
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
      scaleId,
      mode: scaleId,
      style,
      bars,
      bpm,
      loop,
      cells,
      effects: {
        reverb: reverbAmount,
        tone: toneAmount,
        tape: tapeAmount,
      },
      ampProfileId,
      instrumentId,
      pianoOctaveShift,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [keyName, scaleId, style, bars, bpm, loop, cells, reverbAmount, toneAmount, tapeAmount, ampProfileId, instrumentId, pianoOctaveShift]);

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
        mode: scaleId,
        style,
        bars,
        resolution: RESOLUTION,
        lockedMap,
      });
      const withVoicings = applyVoicings(next);
      setCells(withVoicings);
      setSelectedIndex(withVoicings[0]?.index ?? null);
    },
    [applyVoicings, keyName, scaleId, style, bars],
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

  useEffect(() => {
    applyAmpProfile(ampProfileId);
  }, [ampProfileId]);

  useEffect(() => {
    applyInstrument(instrumentId).catch(() => {});
  }, [instrumentId]);

  useEffect(() => {
    if (instrumentId === 'piano') {
      applyInstrumentOctaveShift(pianoOctaveShift);
    } else {
      applyInstrumentOctaveShift(0);
    }
  }, [instrumentId, pianoOctaveShift]);

  const soloInstrument = useMemo(() => getInstrument(soloInstrumentId), [soloInstrumentId]);
  const soloTuning = useMemo(() => getInstrumentTuning(soloInstrument, soloTuningId), [soloInstrument, soloTuningId]);

  useEffect(() => {
    if (!soloInstrument.tunings.some((option) => option.id === soloTuningId)) {
      setSoloTuningId(soloInstrument.tunings[0]?.id ?? '');
    }
  }, [soloInstrument, soloTuningId]);

  useEffect(() => {
    setScalePositionIndex(DEFAULT_SCALE_POSITION_INDEX);
  }, [soloInstrumentId, soloTuningId]);

  const selectedCell = cells.find((cell) => cell.index === selectedIndex) ?? cells[0];
  const voicingOptions = useMemo(() => {
    if (!selectedCell) {
      return [];
    }
    return getVoicingsForSymbol(selectedCell.symbol);
  }, [selectedCell]);

  const scaleDef = useMemo(() => getScaleById(scaleId), [scaleId]);
  const manualChordOptions = useMemo(
    () => buildManualChordOptions({ key: keyName, scale: scaleDef, genre: style }),
    [keyName, scaleDef, style],
  );
  const currentSongPayload = useMemo<SongPayload>(
    () => ({
      keyName,
      scaleId,
      style,
      bpm,
      loop,
      cells,
    }),
    [keyName, scaleId, style, bpm, loop, cells],
  );
  const soloScaleData = useMemo(
    () =>
      buildInstrumentScaleData({
        instrument: soloInstrument,
        tuning: soloTuning,
        key: keyName,
        scale: scaleDef,
        positionIndex: scalePositionIndex,
      }),
    [soloInstrument, soloTuning, keyName, scaleDef, scalePositionIndex],
  );
  const {
    markers: scaleMarkers,
    highlightIds: scaleHighlightIds,
    tuningNotes: soloTuningNotes,
    windows: soloWindows,
    clampedPositionIndex,
  } = soloScaleData;

  useEffect(() => {
    setScalePositionIndex((current) => (current === clampedPositionIndex ? current : clampedPositionIndex));
  }, [clampedPositionIndex]);

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
          const updated = reharmonizeHarmonyCell(cell, { key: keyName, mode: scaleId, style });
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
  const handleManualChordChange = (option: ManualChordOption) => {
    if (!selectedCell) {
      return;
    }
    setCells((prev) =>
      applyVoicings(
        prev.map((cell) =>
          cell.index === selectedCell.index
            ? { ...cell, roman: option.roman, symbol: option.symbol, voicing: undefined }
            : cell,
        ),
      ),
    );
  };

  const handleHumanize = () => {
    setCells((prev) => applyVoicings(humanizeChordCells(prev, style)));
  };

  const handleQuantize = () => {
    setCells((prev) => quantizeProgression(prev));
  };

  const handleMoveCell = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) {
      return;
    }
    const targetIndex = Math.min(Math.max(toIndex, 0), Math.max(0, cells.length - 1));
    setCells((prev) => {
      const next = [...prev];
      const fromPos = next.findIndex((cell) => cell.index === fromIndex);
      let toPos = next.findIndex((cell) => cell.index === toIndex);
      if (fromPos === -1) {
        return prev;
      }
      if (toPos === -1) {
        if (toIndex >= next.length) {
          toPos = next.length;
        } else if (toIndex <= 0) {
          toPos = 0;
        } else {
          return prev;
        }
      }
      const [moved] = next.splice(fromPos, 1);
      if (fromPos < toPos) {
        toPos -= 1;
      }
      next.splice(toPos, 0, moved);
      return next.map((cell, idx) => ({ ...cell, index: idx }));
    });
    setSelectedIndex((current) => {
      if (current === null) {
        return current;
      }
      if (current === fromIndex) {
        return targetIndex;
      }
      if (fromIndex < current && current <= targetIndex) {
        return current - 1;
      }
      if (targetIndex <= current && current < fromIndex) {
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
    if (!tempoReady) {
      return;
    }
    const started = await playProgression(cells, loop, { mode: arpeggioMode });
    setIsPlaying(started);
  };

  const handleStop = () => {
    stopPlayback();
    setIsPlaying(false);
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

  const handleAmpChange = (value: string) => {
    setAmpProfileId(value);
  };

  const handleInstrumentChange = (value: string) => {
    setInstrumentId(value);
  };

  const handlePianoOctaveShiftChange = (value: number) => {
    setPianoOctaveShift(clampOctaveShiftValue(value));
  };

  const handleSongLoad = (payload: SongPayload) => {
    setKeyName(payload.keyName);
    setScaleId(payload.scaleId);
    setStyle(payload.style);
    setBpm(payload.bpm);
    setLoop(payload.loop);
    setCells(payload.cells);
    setSelectedIndex(payload.cells[0]?.index ?? null);
    setShowSongModal(false);
  };

  const altChords = selectedCell ? buildAltChords(selectedCell.symbol) : [];
  const isPianoSelected = instrumentId === 'piano';

  return (
    <div className="chords-shell">
      <header className="page-header">
        <div className="page-header__stack">
          <BackButton />
          <div className="page-heading">
            <p className="eyebrow">Chord Progressions</p>
            <p className="page-title">Generate genre-aware progressions with adaptive voicings.</p>
          </div>
        </div>
        <div className="page-header__actions">
          <Link to="/scales" className="page-swap">Scales →</Link>
          <SupportButton className="page-ko-fi" />
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
            Scale
            <select value={scaleId} onChange={(event) => setScaleId(event.target.value as ModeName)}>
              {SCALE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Genre
            <select value={style} onChange={(event) => setStyle(event.target.value as StyleName)}>
              {STYLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            BPM
            <input
              type="number"
              value={bpm}
              min={40}
              max={220}
              onChange={(event) => setBpm(Number(event.target.value))}
            />
          </label>
        </div>
        <div className="controls-right">
          <div className="control-buttons primary-actions">
            <button type="button" className="primary" onClick={() => handleGenerate(true)}>
              Generate
            </button>
            <button type="button" onClick={() => setShowSongModal(true)}>
              Songs
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
                  mode: scaleId,
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
              <p className="eyebrow scale-pane__eyebrow">
                Solo Scale: {keyName} · {scaleDef.name}
              </p>
              <div className="scale-pane__controls-row">
                <div className="scale-pane__selectors">
                  <label>
                    Instrument
                    <select value={soloInstrumentId} onChange={(event) => setSoloInstrumentId(event.target.value as InstrumentId)}>
                      {INSTRUMENTS.map((instrumentOption) => (
                        <option key={instrumentOption.id} value={instrumentOption.id}>
                          {instrumentOption.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Tuning
                    <select value={soloTuningId} onChange={(event) => setSoloTuningId(event.target.value)}>
                      {soloInstrument.tunings.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="scale-position-toggle">
                  {soloWindows.length ? (
                    soloWindows.map((window) => (
                      <button
                        type="button"
                        key={`scale-pos-${window.index}`}
                      className={window.index === scalePositionIndex ? 'active' : ''}
                      onClick={() => setScalePositionIndex(window.index)}
                    >
                      {window.index + 1}
                    </button>
                  ))
                ) : (
                  <span className="muted">No positions</span>
                )}
                </div>
              </div>
            </div>
            <div className="scale-pane__board">
              <FretboardView
                markers={scaleMarkers}
                highlightIds={scaleHighlightIds}
                tuning={soloTuningNotes}
                frets={soloInstrument.frets}
              />
            </div>
          </div>
        <div className="voicing-options">
          <nav className="voicing-tabs">
            <button type="button" className={panelTab === 'voicings' ? 'active' : ''} onClick={() => setPanelTab('voicings')}>
              Voicings
            </button>
            <button type="button" className={panelTab === 'change' ? 'active' : ''} onClick={() => setPanelTab('change')}>
              Change
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
          {panelTab === 'change' && (
            <div className="manual-chord-grid">
              {manualChordOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="manual-chord-option"
                  onClick={() => handleManualChordChange(option)}
                >
                  <span className="manual-chord-roman">{option.roman}</span>
                  <span className="manual-chord-symbol">{option.symbol}</span>
                </button>
              ))}
              {!manualChordOptions.length && <p className="muted">No chords available for this scale.</p>}
            </div>
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
              loop={loop}
              isPlaying={isPlaying}
              onPlay={handlePlay}
              onStop={handleStop}
              onToggleLoop={setLoop}
            mode={arpeggioMode}
            onModeChange={setArpeggioMode}
            reverb={reverbAmount}
            tone={toneAmount}
            tape={tapeAmount}
            onReverbChange={handleReverbChange}
            onToneChange={handleToneChange}
            onTapeChange={handleTapeChange}
            ampProfiles={AMP_PROFILES}
            ampId={ampProfileId}
            onAmpChange={handleAmpChange}
            instrument={instrumentId}
            instrumentOptions={INSTRUMENT_OPTIONS}
            onInstrumentChange={handleInstrumentChange}
            showOctaveShift={isPianoSelected}
            octaveShift={isPianoSelected ? pianoOctaveShift : 0}
            octaveShiftOptions={PIANO_OCTAVE_OPTIONS}
            onOctaveShiftChange={handlePianoOctaveShiftChange}
          />
          </div>
        </section>

      </div>
      <SongManagerModal open={showSongModal} onClose={() => setShowSongModal(false)} current={currentSongPayload} onLoad={handleSongLoad} />
    </div>
  );
}

function quantizeProgression(cells: HarmonyCell[]): HarmonyCell[] {
  return cells
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((cell, index) => ({ ...cell, index }));
}

type ManualChordOption = {
  id: string;
  roman: RomanDegree;
  symbol: string;
};

function buildManualChordOptions({
  key,
  scale,
  genre,
}: {
  key: string;
  scale: ScaleDef;
  genre: StyleName;
}): ManualChordOption[] {
  if (!scale) {
    return [];
  }
  const degrees = listGenreDegrees(genre);
  if (!degrees.length) {
    return [];
  }
  const uniqueDegrees = Array.from(new Set(degrees));
  const options = uniqueDegrees.map((degree) => {
    const symbol = buildChordSymbolForDegree({ key, mode: scale.id, degree, genre, humanise: false });
    return {
      id: `${degree}-${symbol}`,
      roman: degree,
      symbol,
    };
  });
  const order = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
  options.sort((a, b) => {
    const aIndex = order.indexOf(stripDegreeAccidentals(a.roman));
    const bIndex = order.indexOf(stripDegreeAccidentals(b.roman));
    if (aIndex === -1 || bIndex === -1) {
      return a.roman.localeCompare(b.roman);
    }
    return aIndex - bIndex;
  });
  return options;
}

function stripDegreeAccidentals(roman: RomanDegree): string {
  return roman.replace(/[b#]/g, '');
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
