import type { StyleName, StylePack } from './types';

const neoSoul: StylePack = {
  name: 'neo-soul',
  displayName: 'Neo-soul',
  start: { Imaj7: 0.5, vi7: 0.3, ii7: 0.2 },
  transitions: {
    Imaj7: { ii7: 0.4, IVmaj7: 0.2, vi7: 0.2, bVIImaj7: 0.2 },
    ii7: { V7: 0.6, V9sus4: 0.2, bVIImaj7: 0.2 },
    V7: { Imaj7: 0.6, vi7: 0.3, bVIImaj7: 0.1 },
    vi7: { ii7: 0.4, IVmaj7: 0.3, V7: 0.3 },
    IVmaj7: { Imaj7: 0.4, ii7: 0.4, iii7: 0.2 },
    bVIImaj7: { Imaj7: 0.6, IVmaj7: 0.4 },
    iii7: { vi7: 0.6, ii7: 0.4 },
  },
  allowedBorrowed: ['bVII', 'bIII', 'iv', 'bVI'],
  defaultExtensions: {
    T: ['maj9', '6/9'],
    SD: ['m9', 'm11'],
    D: ['9', '13', 'sus4'],
  },
};

const pop: StylePack = {
  name: 'pop',
  displayName: 'Pop',
  start: { I: 0.5, vi: 0.3, V: 0.2 },
  transitions: {
    I: { V: 0.4, vi: 0.3, IV: 0.3 },
    vi: { IV: 0.5, V: 0.5 },
    IV: { V: 0.6, I: 0.4 },
    V: { I: 0.8, vi: 0.2 },
  },
  allowedBorrowed: ['bVII', 'bIII'],
  defaultExtensions: {
    T: ['maj7'],
    SD: ['add9', '6'],
    D: ['7', 'sus4'],
  },
};

const lofi: StylePack = {
  name: 'lofi',
  displayName: 'Lo-fi',
  start: { Imaj9: 0.4, IVmaj7: 0.2, ii7: 0.2, vi7: 0.2 },
  transitions: {
    Imaj9: { IVmaj7: 0.3, ii7: 0.2, vi7: 0.2, V9sus4: 0.15, bIIImaj7: 0.15 },
    IVmaj7: { Imaj9: 0.4, ii7: 0.3, V7sus2: 0.2, vi7: 0.1 },
    ii7: { V7sus2: 0.4, V7: 0.2, bVIImaj7: 0.2, iim9: 0.2 },
    vi7: { ii7: 0.4, IVmaj7: 0.3, V7sus2: 0.3 },
    bIIImaj7: { Imaj9: 0.5, IVmaj7: 0.5 },
    bVIImaj7: { Imaj9: 0.5, IVmaj7: 0.5 },
    iim9: { V7sus2: 0.5, Imaj9: 0.5 },
    V7sus2: { Imaj9: 0.4, vi7: 0.3, ii7: 0.3 },
  },
  allowedBorrowed: ['bVII', 'bIII', 'iv'],
  defaultExtensions: {
    T: ['maj7', 'maj7(9)', 'maj9#11'],
    SD: ['m9', 'sus2', 'm11'],
    D: ['9sus4', '7sus2', '7'],
  },
};

const bluesTemplates = {
  classic: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'],
  quickChange: ['I7', 'IV7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'],
  jazz: ['I7', 'IV7', 'I7', 'I7', 'IV7', 'iv7', 'I7', 'VI7', 'II7', 'V7', 'I7', 'bVI7'],
};

const blues: StylePack = {
  name: 'blues',
  displayName: 'Blues',
  start: { I7: 1 },
  transitions: {
    I7: { IV7: 0.3, I7: 0.4, V7: 0.3 },
    IV7: { I7: 0.5, V7: 0.5 },
    V7: { IV7: 0.4, I7: 0.4, bVI7: 0.2 },
    bVI7: { V7: 1 },
    VI7: { II7: 1 },
    II7: { V7: 1 },
  },
  allowedBorrowed: ['bVI'],
  defaultExtensions: {
    T: ['9', '13'],
    SD: ['9', 'sus4'],
    D: ['13', '9', 'b9'],
  },
  templates: Object.values(bluesTemplates),
};

export const STYLE_PACKS: Record<StyleName, StylePack> = {
  'neo-soul': neoSoul,
  pop,
  lofi,
  blues,
};

export function getStylePack(style: StyleName): StylePack {
  return STYLE_PACKS[style] ?? neoSoul;
}

export function listStyles(): StylePack[] {
  return Object.values(STYLE_PACKS);
}
