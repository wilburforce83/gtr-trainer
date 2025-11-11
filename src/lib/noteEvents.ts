export type NoteSource = 'fretboard' | 'tab' | 'transport';

const HOVER_EVENT = 'gtr-note-hover';
const PLAY_EVENT = 'gtr-note-play';

type HoverDetail = { id: string | null; source: NoteSource };
type PlayDetail = { id: string | null; sequenceIndex: number | null };

type HoverHandler = (detail: HoverDetail) => void;
type PlayHandler = (detail: PlayDetail) => void;

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

export function emitNoteHover(id: string | null, source: NoteSource): void {
  if (!hasWindow()) {
    return;
  }
  window.dispatchEvent(new CustomEvent<HoverDetail>(HOVER_EVENT, { detail: { id, source } }));
}

export function emitNotePlay(id: string | null, sequenceIndex: number | null = null): void {
  if (!hasWindow()) {
    return;
  }
  window.dispatchEvent(new CustomEvent<PlayDetail>(PLAY_EVENT, { detail: { id, sequenceIndex } }));
}

export function onNoteHover(handler: HoverHandler): () => void {
  if (!hasWindow()) {
    return () => {};
  }
  const wrapped = (event: Event) => {
    const custom = event as CustomEvent<HoverDetail>;
    handler(custom.detail);
  };
  window.addEventListener(HOVER_EVENT, wrapped);
  return () => window.removeEventListener(HOVER_EVENT, wrapped);
}

export function onNotePlay(handler: PlayHandler): () => void {
  if (!hasWindow()) {
    return () => {};
  }
  const wrapped = (event: Event) => {
    const custom = event as CustomEvent<PlayDetail>;
    handler(custom.detail);
  };
  window.addEventListener(PLAY_EVENT, wrapped);
  return () => window.removeEventListener(PLAY_EVENT, wrapped);
}
