import { useEffect, useMemo, useRef, useState } from 'react';
import Controls from '../components/Controls';
import FretboardView from '../components/FretboardView';
import TabView from '../components/TabView';
import Toolbar from '../components/Toolbar';
import BackButton from '../components/BackButton';
import { buildPositions } from '../lib/positions';
import { buildNeckMarkers, STANDARD_TUNING, tuningToMidi } from '../lib/neck';
import { buildSequence } from '../lib/sequencing';
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
import { playSequence, setBpm, stopAll, primeAudioUnlock, setGlobalVolume } from '../lib/audio';
import type { NoteMarker } from '../lib/neck';
import type { SequenceToken } from '../lib/sequencing';

const TUNING_OPTIONS = [
  { id: 'EADGBE', label: 'Standard (EADGBE)', value: STANDARD_TUNING },
  { id: 'DROP_D', label: 'Drop D (DADGBE)', value: ['E4', 'B3', 'G3', 'D3', 'A2', 'D2'] },
];

function ScalesPage() {
  const [tuningId, setTuningId] = useState('EADGBE');
  const [keyName, setKeyName] = useState(DEFAULT_KEY);
  const [scaleId, setScaleId] = useState(DEFAULT_SCALE_ID);
  const [positionIndex, setPositionIndex] = useState(0);
  const [bpm, setBpmValue] = useState(70);
  const [loop, setLoop] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.6);
  const [isPlaying, setIsPlaying] = useState(false);

  const fretboardRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<HTMLDivElement>(null);

  const tuning = useMemo(() => {
    return TUNING_OPTIONS.find((option) => option.id === tuningId)?.value ?? STANDARD_TUNING;
  }, [tuningId]);

  const tuningMidi = useMemo(() => tuningToMidi(tuning), [tuning]);
  const scaleDef: ScaleDef = useMemo(() => getScaleById(scaleId), [scaleId]);

  const positions = useMemo(
    () => buildPositions({ key: keyName, scale: scaleDef, tuningMidi }),
    [keyName, scaleDef, tuningMidi],
  );

  useEffect(() => {
    if (positionIndex >= positions.length) {
      setPositionIndex(0);
    }
  }, [positions.length, positionIndex]);

  const currentPosition = positions[positionIndex];

  const markers: NoteMarker[] = useMemo(
    () => buildNeckMarkers({ key: keyName, scale: scaleDef, tuning, highlighted: currentPosition?.idSet }),
    [keyName, scaleDef, tuning, currentPosition],
  );

  const sequence: SequenceToken[] = useMemo(() => {
    if (!currentPosition) {
      return [];
    }
    return buildSequence(currentPosition);
  }, [currentPosition]);

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
    await playSequence(sequence, { loop, countIn: 8, masterVolume });
    setIsPlaying(true);
  };

  useEffect(() => {
    setGlobalVolume(masterVolume);
  }, [masterVolume]);

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
        <div>
          <p className="eyebrow">Scales Trainer</p>
          <h1>Visualize every position across the neck.</h1>
        </div>
      </header>

      <Controls
        tunings={TUNING_OPTIONS}
        tuningId={tuningId}
        onTuningChange={setTuningId}
        keys={KEY_OPTIONS}
        keyName={keyName}
        onKeyChange={setKeyName}
        scales={SCALES}
        scaleId={scaleDef.id}
        onScaleChange={setScaleId}
        positionIndex={positionIndex}
        positionCount={positions.length}
        onPositionChange={setPositionIndex}
        bpm={bpm}
        onBpmChange={setBpmValue}
        onPlay={handlePlay}
        onStop={handleStop}
        isPlaying={isPlaying}
        loop={loop}
        onLoopToggle={setLoop}
        volume={masterVolume}
        onVolumeChange={setMasterVolume}
        onRelativeToggle={handleFlipRelative}
        canFlipRelative={Boolean(scaleDef.relativeScaleId)}
      />

      <Toolbar onExportFretboard={exportFretboard} onExportTab={exportTab} />

      <div className="viewport">
        <div className="surface fretboard-container">
          <FretboardView markers={markers} highlightIds={currentPosition?.idSet ?? new Set()} tuning={tuning} ref={fretboardRef} />
        </div>
        <div className="surface tab-surface">
          <TabView sequence={sequence} ref={tabRef} />
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
