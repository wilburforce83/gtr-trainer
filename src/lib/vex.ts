import { Flow } from 'vexflow';
import type { SequenceToken } from './sequencing';

const BASE_WIDTH = 480;
const NOTE_COLOR = '#fbbf24';
const STAVE_COLOR = '#666666';

export function clearTab(container: HTMLDivElement | null): void {
  if (!container) {
    return;
  }
  container.innerHTML = '';
}

function getTabHeight(stringCount: number): number {
  const minLines = Math.max(1, stringCount);
  const lineSpacing = 18;
  const padding = 70;
  return padding + (minLines - 1) * lineSpacing + 60;
}

export function renderTab(container: HTMLDivElement | null, sequence: SequenceToken[], stringCount = 6): void {
  if (!container) {
    return;
  }
  clearTab(container);
  const containerWidth = container.clientWidth || BASE_WIDTH;
  const dynamicWidth = Math.max(BASE_WIDTH, sequence.length * 32);
  const width = Math.max(containerWidth, dynamicWidth);
  const tabHeight = getTabHeight(stringCount);
  const renderer = new Flow.Renderer(container, Flow.Renderer.Backends.SVG);
  renderer.resize(width, tabHeight);
  const context = renderer.getContext();
  context.setFont('DM Mono', 14, 'normal');
  context.setFillStyle(NOTE_COLOR);
  context.setStrokeStyle(NOTE_COLOR);
  context.setBackgroundFillStyle('rgba(0,0,0,0)');

  const staveX = 30;
  const stave = new Flow.TabStave(staveX, 20, width - staveX * 2, { num_lines: stringCount });
  stave.setNoteStartX(stave.getNoteStartX() + 10);
  stave.setStyle({ strokeStyle: STAVE_COLOR, fillStyle: STAVE_COLOR });
  stave.setContext(context);
  context.setStrokeStyle(STAVE_COLOR);
  context.setFillStyle(STAVE_COLOR);
  stave.draw();
  drawTabLabel(context, stave, stringCount);
  context.setFillStyle(NOTE_COLOR);
  context.setStrokeStyle(NOTE_COLOR);

  const notes = sequence.map((step) =>
    new Flow.TabNote({
      positions: [{ str: step.string, fret: step.fret.toString() }],
      duration: step.duration,
    }).setStyle({ fillStyle: NOTE_COLOR, strokeStyle: NOTE_COLOR }),
  );

  const voice = new Flow.Voice({
    num_beats: sequence.length,
    beat_value: 8,
    resolution: Flow.RESOLUTION,
  });
  voice.setStrict(false);
  voice.addTickables(notes);

  new Flow.Formatter().joinVoices([voice]).format([voice], width - 80);
  voice.draw(context, stave);
}

function drawTabLabel(context: any, stave: any, stringCount: number): void {
  if (!stringCount) {
    return;
  }
  const topLine = stave.getYForLine(0);
  const bottomLine = stave.getYForLine(Math.max(0, stringCount - 1));
  const midY = (topLine + bottomLine) / 2;
  context.save();
  context.setFont('DM Mono', 16, 'bold');
  context.setFillStyle(STAVE_COLOR);
  context.fillText('', stave.getX() - 28, midY + 6);
  context.restore();
}
