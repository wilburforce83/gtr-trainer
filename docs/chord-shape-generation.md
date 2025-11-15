# Chord Shape Generation Pipeline

The voicing engine now ships with canonical chord shapes grounded in the reference material inside `docs/reference_docs/`. Open chords come directly from `guitar-chord-chart.png`; movable CAGED and jazz voicings fill the remaining gaps. This document describes the full pipeline so future updates remain repeatable.

---

## 1. Data sources

| Asset | Purpose |
| --- | --- |
| `docs/reference_docs/guitar-chord-chart.png` | Ground truth for open grips (C, A, G, D, E families, sus chords, open sevenths, etc.). Every open `ShapeForm` stores a `source` pointing back to this file for traceability. |
| `src/chords/shapeLibrary.ts` | Contains the curated `ShapeForm[]` list: open shapes transcribed from the PNG plus movable E/A-root barre forms, 9/m9/maj9 jazz grips, and compact dim/aug voicings. |
| `src/chords/noteUtils.ts` | Pitch-class helpers, fret→MIDI math, and note normalization. |
| `src/chords/chordKinds.ts` | Defines the `ChordKind` union, allowed interval sets, suffix normalisation, and helper utilities. |
| `src/chords/voicings.ts` | Main entry point (`getCanonicalVoicings`, `getVoicingsForSymbol`, `chooseVoicing`). Projects shapes onto the fretboard, validates harmony, and sorts the resulting voicings. |

### Shape form model

`shapeLibrary.ts` exports entries like:

```ts
export type ShapeForm = {
  id: string;
  label: string;                  // e.g. "Open C", "E shape barre"
  chordKind: ChordKind;           // "", "m", "maj7", etc.
  rootString: 1 | 2 | 3 | 4 | 5 | 6;
  pattern: Array<{ str: number; fretOffset: number }>;
  movable: boolean;               // false = fixed open chord, true = transpose along the neck
  referenceRoot: NoteName;        // note used in the source diagram
  referenceRootFret: number;      // fret of the root note on rootString
  muted?: number[];
  openStrings?: number[];
  minRootFret?: number;
  maxRootFret?: number;
  priority?: number;
  source?: string;                // e.g. 'docs/reference_docs/guitar-chord-chart.png#A7'
};
```

* `pattern` entries describe offsets relative to the root fret. Negative offsets handle open strings, positive offsets place extensions above the root. An offset of `-999` is treated as an inline mute so we can keep the full layout inside a single array.
* `movable = false` locks the form to its reference root (only used for open shapes captured from the PNG). `movable = true` allows the engine to transpose it to every fret where the target root exists on `rootString`.
* Each movable form is annotated with a synthetic `source` (`caged-…`, `jazz-…`) so we can distinguish references from curated grips.

To build the library we manually read each chord on the PNG, transcribed its six-string layout (X/O/fret numbers), and encoded the offsets above. That keeps the data human-auditable without needing a brittle PDF/Python OCR step, but we can always add scripts later if we want automated parsing.

---

## 2. From `ShapeForm` to `Voicing`

The `Voicing` type still powers everything:

```ts
export type Voicing = {
  chordKind: string;
  root: string;
  strings: { str: number; fret: number }[]; // 6 entries, low E → high E
  name?: string;
  id?: string;
};
```

`getVoicingsForSymbol("G7")` performs the following steps:

1. **Parse the symbol** – a regex splits the root (`G`) from the suffix (`7`). `normalizeNoteName` standardises the root while `resolveChordKind` maps `7`, `m`, `maj9`, `sus2`, etc. to the canonical `ChordKind` union.
2. **Lookup shape forms** – `getFormsForKind(kind)` filters `SHAPE_FORMS` down to those that match the requested chord type.
3. **Place the root** – for movable shapes the engine searches every fret on `rootString` where that root note occurs (bounded by `minRootFret`/`maxRootFret`). Open shapes simply reuse their `referenceRootFret`.
4. **Project the pattern** – for each candidate root fret:
   * `fret = rootFret + fretOffset`. Values < 0 are valid (open strings) while values <= `-999` become mutes.
   * Strings not mentioned in `pattern` fall back to the `muted`/`openStrings` lists.
   * Candidates that produce frets outside 0–20 are discarded.
5. **Apply constraints** – voicings must have at least one sounding string, fretted span ≤ 5, and highest fret ≤ 17.
6. **Harmony validation** – `KIND_INTERVALS` defines the allowed intervals for each chord type (e.g. m7 = {0,3,7,10}). Additional guards (`KIND_GUARDS`) ensure:
   * The correct third (major/minor) or suspended degree is present.
   * Sevenths appear when required (`7`, `m7`, `maj7`, `9`, `m9`, `maj9`).
   * Ninths appear for `9`/`m9`/`maj9`.
   * No extra intervals sneak in.
7. **Dedupe and score** – duplicates (identical string layouts) are removed. The remaining voicings are scored by average fret, fret span, and open-string bonus so open grips bubble up before higher-position shapes. Up to four voicings are returned to the UI.
8. **Progression smoothing** – `chooseVoicing` still minimises fret movement between consecutive cells to keep generated progressions playable.

---

## 3. Rendering with svguitar

`src/chords/svguitar.ts` converts `Voicing` objects into svguitar diagrams:

1. Determine the lowest fretted note. Positions at `≤ 1` use the nut; otherwise the viewport starts one fret below the lowest finger.
2. Convert each string into the svguitar `fingers` payload (`'x'`, open-circle, or local fret index via `fret - position + 1`).
3. Run `detectBarres` to mark consecutive strings sharing the same fret.
4. Render with the shared palette (`PALETTE`) and sizing overrides so the chords panel stays compact.

---

## 4. Validation rules

* **Pitch-class math** – `noteUtils.ts` maps strings/frets to pitch classes, so enharmonic inputs (e.g. `Db`) resolve cleanly.
* **Interval guards** – `src/chords/chordKinds.ts` stores the allowed semitone sets and third/seventh/ninth requirements per `ChordKind`.
* **Playability** – max fret span 5, frets ≤ 17, at least one sounding string.
* **Tests** – `src/chords/getCanonicalVoicings.test.ts` verifies hallmark shapes (open C, Am, G7, F barre, Bb m7, Eb maj7, G9, Bdim) and structural constraints (allowed intervals, fret span).

---

## 5. Extending the library

1. Add or adjust `ShapeForm` entries in `shapeLibrary.ts`. Keep `source` populated so auditors know which reference produced the data.
2. If you introduce a new `ChordKind`, update `chordKinds.ts` (intervals + suffix mapping).
3. Run `npm run test` and `npm run lint` to make sure the canonical suite still passes.

Because svguitar diagrams, the chord list UI, MIDI export, and PNG export all read from `getCanonicalVoicings`, any new shapes automatically flow through the whole experience.
