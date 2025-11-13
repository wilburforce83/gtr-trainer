const DRUM_BASE = '/samples/drums/';

function pad(num: number, length = 2): string {
  return String(num).padStart(length, '0');
}

function buildSeries(prefix: string, start: number, end: number, suffix: string): string[] {
  const items: string[] = [];
  for (let value = start; value <= end; value += 1) {
    items.push(`${prefix}${pad(value)}${suffix}`);
  }
  return items;
}

export const KICK_SAMPLES = buildSeries('Kick-V', 1, 12, '-Yamaha-16x16.wav');
export const SNARE_SAMPLES = buildSeries('SNARE-V', 1, 14, '-CustomWorks-6x13.wav');
export const RIMSHOT_SAMPLES = buildSeries('RIMSHOTS-V', 1, 8, '-CW-6x13.wav');
export const HAT_CLOSED_SAMPLES = buildSeries('HHats-CL-V', 1, 10, '-SABIAN-AAX.wav');
export const HAT_OPEN_SAMPLES = buildSeries('HHats-OP-V', 1, 8, '-SABIAN-AAX.wav');
export const HAT_CRASH_SAMPLES = buildSeries('HHats-Crash-V', 1, 3, '-SABIAN-AAX.wav');
export const HAT_PEDAL_SAMPLES = ['HHats-PDL-V01-SABIAN-AAX.wav', 'HHats-PDL-V02-SABIAN-AAX.wav', 'HHats-PDL-V04-SABIAN-AAX.wav', 'HHats-PDL-V05-SABIAN-AAX.wav'];

export const DRUM_SAMPLE_BASE = DRUM_BASE;

export type DrumSamplePool =
  | 'kick'
  | 'snare'
  | 'rimshot'
  | 'hatsClosed'
  | 'hatsOpen'
  | 'hatsPedal'
  | 'crash';

export const SAMPLE_POOLS: Record<DrumSamplePool, string[]> = {
  kick: KICK_SAMPLES,
  snare: SNARE_SAMPLES,
  rimshot: RIMSHOT_SAMPLES,
  hatsClosed: HAT_CLOSED_SAMPLES,
  hatsOpen: HAT_OPEN_SAMPLES,
  hatsPedal: HAT_PEDAL_SAMPLES,
  crash: HAT_CRASH_SAMPLES,
};

export function randomSample(pool: DrumSamplePool): string {
  const samples = SAMPLE_POOLS[pool];
  if (!samples?.length) {
    return '';
  }
  const index = Math.floor(Math.random() * samples.length);
  return samples[index]!;
}
