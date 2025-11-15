import { useMemo } from 'react';
import type { ScaleDef } from '../scales';
import {
  DEFAULT_FRET_SPAN,
  buildInstrumentScaleData,
  type InstrumentConfig,
  type InstrumentTuning,
} from '../lib/instrumentScales';

type Params = {
  instrument: InstrumentConfig;
  tuning: InstrumentTuning;
  key: string;
  scale: ScaleDef;
  positionIndex: number;
  fretSpan?: number;
};

type InstrumentScaleData = ReturnType<typeof buildInstrumentScaleData>;

export function useInstrumentScaleData({
  instrument,
  tuning,
  key,
  scale,
  positionIndex,
  fretSpan = DEFAULT_FRET_SPAN,
}: Params): InstrumentScaleData {
  return useMemo(
    () =>
      buildInstrumentScaleData({
        instrument,
        tuning,
        key,
        scale,
        positionIndex,
        fretSpan,
      }),
    [instrument, tuning, key, scale, positionIndex, fretSpan],
  );
}

export default useInstrumentScaleData;
