# Drum Pattern Authoring Guide (ELI5 Edition)

Welcome to the GTL drum engine! This guide walks you through crafting new backing grooves so they appear automatically inside the Drum selector. No audio engineering degree required—just follow these steps.

---

## 1. What lives where?

- Every genre has its own folder in `src/drums/patterns/<genre>/pattern.ts`.
- Each file exports an array of **pattern definitions**:

```ts
export const POP_PATTERNS: PatternDefinition[] = [
  {
    name: 'Classic Pop Pulse',      // This appears in the UI dropdown
    builder: (barCount, swing) => { ... return DrumBar[] ... },
  },
  // add more objects here…
];
```

- A `builder` receives:
  - `barCount` (usually 8 or 16)—feel free to ignore and just loop; the helper repeats for you.
  - `swing` (genre-specific value you can pass into hat helpers).
  - You must call `buildPattern(barCount, (bar, barIndex) => { ... })` to create each bar.

- Once you export/update patterns, running `npm run dev` or `npm run build` will automatically pick them up. The UI dropdown shows “Off” plus every pattern name you provide for the selected genre.

---

## 2. Building a pattern (step-by-step)

1. **Pick the genre file**  
   Example: For Neo-Soul, edit `src/drums/patterns/neoSoul/pattern.ts`.

2. **Add a new object** to the exported array:

```ts
{
  name: 'My New Groove',
  builder: (barCount, swing) =>
    buildPattern(barCount, (bar, barIndex) => {
      // write hits here
    }),
},
```

3. **Place hits using helpers** (they already humanise velocity/timing):

| Helper | Purpose |
| --- | --- |
| `addKickSimple(bar, subdivision, velocity, options?)` | Kick drum. `subdivision` is 0–15 (16th grid). |
| `addSnareSimple(...)` | Snare hit. Add `{ ghost: true }` for ghost notes. |
| `addSnareBackbeatSimple(bar, velocity)` | Places snare on beats 2 & 4. |
| `addHatSimple(...)` | Single hi-hat hit. |
| `fillEvenHats(bar, { step, baseVelocity, accentEvery, swing, ... })` | Auto-fills 8ths/16ths. |
| `fillShuffleHats(bar, swing, accentEvery, humanize?)` | Triplet shuffle hats. |
| `addPercussionSimple(bar, subdivision, velocity, { type: 'pedal' | 'crash' })` | Crashes/pedal hats. |

**Humanisation options** (`velocityJitter`, `offsetJitterMs`) add random variation per hit.

4. **Use `barIndex` for variation**  
   `buildPattern` gives you `barIndex`, so you can do “every 4 bars add a fill”:

```ts
if (barIndex % 4 === 3) {
  addKickSimple(bar, 15, 0.6, { velocityJitter: 0.02 });
}
```

5. **Return nothing; the helper handles the array**  
   `buildPattern` collects each bar into the final pattern.

---

## 3. Coordinate system refresher

- Each bar is split into 16 slots (`0` through `15`).
- Example mapping (4/4, 16th grid):
  - Beat 1 = 0
  - Beat 2 = 4
  - Beat 3 = 8
  - Beat 4 = 12
  - “&” of beat 1 = 2, etc.

Think of it like a step sequencer: you’re specifying which 16th steps get a hit.

---

## 4. Testing your pattern

1. Run `npm run dev`.
2. Pick your genre in the app.
3. Open the Drum dropdown—your `name` string should appear.
4. Hit Play; the groove should lock with the chords and the transport loop.
5. Adjust velocities/swing until it feels natural, then rebuild (`npm run build`) for production.

---

## 5. Tips & troubleshooting

- **Too many hits?** Lower `velocityJitter` or remove ghost notes to clean it up.
- **Pattern not showing?** Check that your exported array is valid JSON-ish TS (no trailing commas before closing `]`).
- **Need more than 4 patterns?** Just keep adding entries—UI updates automatically.
- **Want silence?** Use the “Off” option (value `-1`). All other options are your named patterns.

Happy groove crafting! If you get stuck, search for existing patterns in the repo and copy their structure—they’re the best reference. ***
