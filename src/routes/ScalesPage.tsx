import { useEffect, useMemo, useRef, useState } from 'react';
import Controls from '../components/Controls';
import FretboardView from '../components/FretboardView';
import TabView from '../components/TabView';
import Toolbar from '../components/Toolbar';
import BackButton from '../components/BackButton';
import {
  DEFAULT_FRET_SPAN,
  INSTRUMENTS,
  buildInstrumentScaleData,
  getInstrument,
  getInstrumentTuning,
  type InstrumentId,
} from '../lib/instrumentScales';
import {
  DEFAULT_KEY,
  DEFAULT_SCALE_ID,
  getRelativeScale,
  getScaleById,
  KEY_OPTIONS,
  SCALES,
  type ScaleDef,
} from '../scales';
import { Note } from '@tonaljs/tonal';
import { playSequence, setBpm, stopAll, primeAudioUnlock } from '../lib/audio';

const FRET_SPAN = DEFAULT_FRET_SPAN;
const DEFAULT_POSITION_INDEX = 1;

function ScalesPage() {
  const [instrumentId, setInstrumentId] = useState<InstrumentId>('guitar');
  const initialInstrument = getInstrument('guitar');
  const [tuningId, setTuningId] = useState(initialInstrument.tunings[0]?.id ?? '');
  const [keyName, setKeyName] = useState(DEFAULT_KEY);
  const [scaleId, setScaleId] = useState(DEFAULT_SCALE_ID);
  const [positionIndex, setPositionIndex] = useState(DEFAULT_POSITION_INDEX);
  const [bpm, setBpmValue] = useState(70);
  const [loop, setLoop] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const fretboardRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<HTMLDivElement>(null);

  const instrument = useMemo(() => getInstrument(instrumentId), [instrumentId]);
  const tuning = useMemo(() => getInstrumentTuning(instrument, tuningId), [instrument, tuningId]);

  useEffect(() => {
    if (!instrument.tunings.some((option) => option.id === tuningId)) {
      setTuningId(instrument.tunings[0]?.id ?? '');
    }
  }, [instrument, tuningId]);

  const scaleDef: ScaleDef = useMemo(() => getScaleById(scaleId), [scaleId]);

  const { markers, highlightIds, sequence, tuningNotes, windows, clampedPositionIndex } = useMemo(() => {
    return buildInstrumentScaleData({
      instrument,
      tuning,
      key: keyName,
      scale: scaleDef,
      positionIndex,
      fretSpan: FRET_SPAN,
    });
  }, [instrument, tuning, keyName, scaleDef, positionIndex]);

  useEffect(() => {
    if (clampedPositionIndex !== positionIndex) {
      setPositionIndex(clampedPositionIndex);
    }
  }, [clampedPositionIndex, positionIndex]);

  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

  useEffect(() => {
    primeAudioUnlock();
  }, []);

  const handlePlay = async () => {
    if (!sequence.length) {
      return;
    }
    await setBpm(bpm);
    await playSequence(sequence, { loop, countIn: 4 });
    setIsPlaying(true);
  };

  const handleStop = () => {
    stopAll();
    setIsPlaying(false);
  };

  const exportFretboard = (format: 'svg' | 'png') => {
    if (format === 'svg') {
      exportSvg(fretboardRef.current, 'fretboard');
    } else {
      exportPng(fretboardRef.current, 'fretboard');
    }
  };

  const exportTab = (format: 'svg' | 'png') => {
    if (format === 'svg') {
      exportSvg(tabRef.current, 'tab');
    } else {
      exportPng(tabRef.current, 'tab');
    }
  };

  const handleFlipRelative = () => {
    const relative = getRelativeScale(scaleDef);
    if (!relative) {
      return;
    }
    const newKey = shiftRelativeKey(keyName, scaleDef);
    setKeyName(newKey);
    setScaleId(relative.id);
  };

  return (
    <div className="app-shell">
      <header className="page-header">
        <BackButton />
        <div className="page-heading">
          <p className="eyebrow">Scales Trainer</p>
          <p className="page-title">Visualize every position across the neck.</p>
        </div>
      </header>

      <Controls
        instruments={INSTRUMENTS}
        instrumentId={instrumentId}
        onInstrumentChange={(value) => setInstrumentId(value as InstrumentId)}
        tuningOptions={instrument.tunings.map((option) => ({ id: option.id, label: option.label }))}
        tuningId={tuningId}
        onTuningChange={setTuningId}
        keys={KEY_OPTIONS}
        keyName={keyName}
        onKeyChange={setKeyName}
        scales={SCALES}
        scaleId={scaleDef.id}
        onScaleChange={setScaleId}
        positionIndex={clampedPositionIndex}
        positionCount={windows.length}
        onPositionChange={setPositionIndex}
        bpm={bpm}
        onBpmChange={setBpmValue}
        onPlay={handlePlay}
        onStop={handleStop}
        isPlaying={isPlaying}
        loop={loop}
        onLoopToggle={setLoop}
        onRelativeToggle={handleFlipRelative}
        canFlipRelative={Boolean(scaleDef.relativeScaleId)}
      />

      <Toolbar onExportFretboard={exportFretboard} onExportTab={exportTab} />

      <div className="viewport">
        <div className="surface fretboard-container">
          <FretboardView
            markers={markers}
            highlightIds={highlightIds}
            tuning={tuningNotes}
            frets={instrument.frets}
            ref={fretboardRef}
          />
        </div>
        <div className="surface tab-surface">
          <TabView sequence={sequence} stringCount={tuning.notes.length} ref={tabRef} />
        </div>
      </div>
    </div>
  );
}

function exportSvg(container: HTMLElement | null, filename: string) {
  if (!container) {
    return;
  }
  const svg = container.querySelector('svg');
  if (!svg) {
    return;
  }
  const serialized = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([serialized], { type: 'image/svg+xml' });
  triggerDownload(blob, `${filename}.svg`);
}

function exportPng(container: HTMLElement | null, filename: string) {
  if (!container) {
    return;
  }
  const svg = container.querySelector('svg');
  if (!svg) {
    return;
  }
  const rect = svg.getBoundingClientRect();
  const width = rect.width || svg.viewBox.baseVal?.width || 800;
  const height = rect.height || svg.viewBox.baseVal?.height || 300;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  const data = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (blob) {
        triggerDownload(blob, `${filename}.png`);
      }
    });
  };
  img.src = `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(data)))}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 500);
}

export default ScalesPage;

function shiftRelativeKey(key: string, scale: ScaleDef): string {
  const semitoneShift = scale.flavor === 'minor' ? 3 : scale.flavor === 'major' ? -3 : 0;
  if (!semitoneShift) {
    return key;
  }
  const source = `${key}4`;
  const midi = Note.midi(source);
  if (typeof midi !== 'number') {
    return key;
  }
  const target = Note.fromMidi(midi + semitoneShift);
  const normalized = target ? Note.pitchClass(target) : null;
  return normalized ?? key;
}
