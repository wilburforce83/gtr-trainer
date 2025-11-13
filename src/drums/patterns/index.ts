import type { StyleName } from '../../chords/types';
import type { PatternBuilder } from './shared';
import { POP_PATTERNS } from './pop/pattern';
import { NEO_SOUL_PATTERNS } from './neoSoul/pattern';
import { LOFI_PATTERNS } from './lofi/pattern';
import { BLUES_PATTERNS } from './blues/pattern';

export const PATTERN_LIBRARY: Record<StyleName, PatternBuilder[]> = {
  pop: POP_PATTERNS,
  'neo-soul': NEO_SOUL_PATTERNS,
  lofi: LOFI_PATTERNS,
  blues: BLUES_PATTERNS,
};
