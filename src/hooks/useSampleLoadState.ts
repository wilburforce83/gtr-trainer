import { useEffect, useState } from 'react';
import { getSampleLoadState, subscribeSampleLoadState, type SampleLoadState } from '../lib/samplePlayer';

export function useSampleLoadState(): SampleLoadState {
  const [state, setState] = useState<SampleLoadState>(() => getSampleLoadState());
  useEffect(() => {
    const unsubscribe = subscribeSampleLoadState(setState);
    return unsubscribe;
  }, []);
  return state;
}
