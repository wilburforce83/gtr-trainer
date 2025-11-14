# Scale Position Methodology

This document explains how the trainer currently builds CAGED‑style fretboard positions, the maths that drive the note selection, and what needs to happen when we drop in a corrected shape (e.g. a fixed minor pentatonic Position 3). It covers the code that lives in `src/lib/instrumentScales.ts`, `src/lib/positions.ts`, and the helpers they depend on.

---

## 1. Data Sources & Terminology

| Concept | File / Source | Notes |
| --- | --- | --- |
| Scale definitions | `src/scales/index.ts` | Each `ScaleDef` stores the interval list (in semitones) from the tonic. |
| Instrument tuning | `INSTRUMENTS` in `src/lib/instrumentScales.ts` | Tunings are arrays of MIDI note numbers for every string, plus metadata such as number of frets and the number of CAGED positions we expose. |
| Note markers | `NoteMarker` in `src/lib/neck.ts` | Represents every fret/string pair, with MIDI, pitch class, etc. |

### Pitch Class Maths

* Every human‑readable note gets converted into a pitch class integer (0–11) through `noteNameToPc`. Enharmonic spellings are collapsed to the same PC.
* We keep a list of “sharp” names for consistent rendering (`SHARP_NAMES`), so after arithmetic we can map a pitch class back to a display name via `pcToNoteName`.

### MIDI → Note Labels

* `formatNoteLabel(midi)` prints a note such as `C#4` by combining the pitch class name with the octave (`octave = floor(midi / 12) - 1`).

---

## 2. Building a Scale Pitch-Class Set

`buildScalePcs(root, scaleDef)`:

1. Normalise the provided root (e.g. “Ab” → “Ab”, “C#” → “C#”).
2. Convert the root to a pitch class (`rootPc`).
3. For every interval in the scale definition, add it to `rootPc`, wrap it mod 12.  
   This produces a sorted array of pitch classes that belong to the scale (`pcs`).

These pitch classes are later used to flag which fretboard markers belong to the current scale or the current position.

---

## 3. Position Windows (CAGED)

`buildPositionWindows(instrument, fretSpan)` divides the instrument range into `instrument.positions` windows:

1. `fretSpan` defaults to 4 frets (classic CAGED box size).
2. Compute `maxStart = instrument.frets - fretSpan`.
3. Compute a step size (`step = maxStart / (positions - 1)`), rounded to an integer.
4. For each position index, create a window `[startFret, startFret + fretSpan]`.

`isNoteInPosition(note, window)` still gives us the rough candidates, but we now run an extra clustering pass to keep the actual “box” compact:

### Median-based clustering

1. Collect every in-scale marker that lies inside the numeric window.
2. Compute the **median fret** of that list. (Even counts take the rounded average of the two middle frets.)
3. Keep only notes that fall within `centerFret ± radius`, where the radius comes from the instrument config (`positionRadius`, default 2 frets on guitar).
4. To avoid gaps, ensure each string has at least one marker: if trimming removed a string entirely, add back the note on that string closest to the center fret.
5. De-duplicate pitches across strings: walk strings from low pitch to high pitch, keep the first occurrence of every MIDI value and drop later duplicates. When a duplicate on a higher string gets removed, we “promote” that string to the next unused **scale degree** (max 3 interval steps) that also sits within ±6 frets of the original note.
6. Ensure each active string still shows at least two distinct pitches (when available). Promotion keeps scanning further up the string (within the interval/fret limits) so a string never collapses to a single note.
7. Only the remaining notes become `inCurrentPosition`.

This gives us the familiar 4–5 fret CAGED clusters without introducing hard-coded templates.

---

## 4. Building Fretboard Markers

`buildInstrumentScaleData` (shortened story):

1. Generate every fret/string note marker for the instrument/tuning.
2. Mark each note as:
   * `inScale`: pitch class is in `pcs`.
   * `inCurrentPosition`: both in scale **and** in the clustered box described above.
3. Label each marker with a scale degree using `buildDegreeLabelMap`:
   * Compare the interval to the major scale template `[0,2,4,5,7,9,11]`.
   * Choose the closest degree (within ±1 semitone) and add ♭/♯ symbols.

The result powers the fretboard diagram, tab view, and the CAGED position grid. Because `markersToSequence` filters on `inCurrentPosition`, playback benefits automatically from the tightened & de-duplicated shapes.

---

## 5. Sequence Generation (Playback)

`markersToSequence` →

1. Filter the full marker list down to those that are both in the scale and in the active position.
2. Sort by MIDI, then by string index to remove duplicate pitches.
3. Duplicate the ascending run in reverse (minus the octave duplicate) so we play up & down the position.
4. Convert each marker to a `SequenceToken` (`id`, `midi`, `string`, etc.).

`playSequence` in `src/lib/audio.ts` schedules these tokens at a fixed subdivision (`8n`) and uses Tone.js’ Transport to loop if requested. The scale bug you reported was caused by Transport loop state leaking in from the chords page; we now explicitly reset `loop`, `loopStart`, and `loopEnd` inside `playSequence` and `stopAll` so scales always run to completion.

---

## 6. Limitations & Why Position 3 Looks Wrong

* The positions are still based on numeric windows, but now we trim to a 4–5 fret cluster around the median and drop duplicate pitches on higher strings. This fixes the worst outliers (e.g. minor pent Position 3) without needing scale-specific templates.
* We still don’t explicitly anchor shapes to C/A/G/E/D chord forms, so subtle fingering nuances may differ slightly until we add dedicated overrides.

---

## 7. Rolling in a Corrected Shape

When you hand me a verified set of notes for (say) Pentatonic Position 3, here’s how we’ll integrate it:

1. **Describe the shape** as a list of `(string, fret)` pairs, or as an interval pattern (“root on 6th string, pattern of frets [5,8],[5,7],...”). Either is fine; we just need deterministic coordinates.
2. **Add a shape override** table to `instrumentScales.ts`. A sketch:

   ```ts
   const CAGED_OVERRIDES: Record<
     InstrumentId,
     Record<string /* scaleId */, Record<number /* positionIndex */, Array<{ string: number; fret: number }> >>
   > = { ... };
   ```

3. During `buildInstrumentScaleData`, before we mark notes by window:
   * Check for an override entry.
   * If found, mark any fret/string pair in that override as `inCurrentPosition`, regardless of the sliding window bounds.
4. Keep the existing window logic as a fallback for scales/positions we haven’t corrected yet.

Once the table is in place, swapping in corrected pentatonic patterns is just data entry:

1. Specify each note of the shape (you can use “string/fret root, plus offsets” if that’s faster).
2. Run `npm run build` to ensure TypeScript + Tone integration stays healthy.

---

## 8. Summary Checklist

1. **Math**: Work in pitch classes + MIDI; intervals are raw semitone offsets.
2. **Windows**: Current implementation is generic; corrected CAGED boxes require explicit overrides.
3. **Playback**: Sequence = sorted notes within the position, then mirrored for the descent. Transport reset guarantees the count-in doesn’t interrupt the scale.
4. **Rolling out fixes**: Add an override map, feed in verified shapes, and update the render logic to respect them.

Once you provide the canonical fret layouts for each suspect position, I’ll wire them into `CAGED_OVERRIDES` (or equivalent) so the fretboard, tab, and playback all match the corrected fingering.
