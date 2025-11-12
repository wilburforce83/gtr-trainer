import HeroCard from '../components/HeroCard';

export default function Home() {
  return (
    <main className="home-shell">
      <section className="home-hero">
        <div className="home-hero__copy">
          <p className="eyebrow">Guitar Theory Lab</p>
          <h1>Train your fretboard fluency and craft soulful progressions.</h1>
          <p className="lede">
            Switch between interactive scale visualization and a smart chord progression builder tuned for guitarists.
          </p>
        </div>
        <div className="home-hero__image" role="img" aria-label="Vintage electric guitar resting on a stage amplifier" />
      </section>

      <section className="hero-grid">
        <HeroCard
          title="Scales Trainer"
          description="Explore every position, export fretboard or tab diagrams, and hear the shapes with the built-in sequencer."
          cta="Open Scales"
          to="/scales"
        />
        <HeroCard
          title="Chord Progressions"
          description="Generate genre-aware chord grids, audition voicings, and export audio, MIDI, or diagrams."
          cta="Build Progressions"
          to="/chords"
        />
      </section>

      <section className="home-attributions">
        <p className="eyebrow">Attributions & Thanks</p>
        <small>
          Guitar samples courtesy of{' '}
          <a href="https://karoryfer.com/karoryfer-samples" target="_blank" rel="noreferrer">
            Karoryfer Lecolds Black Hofner
          </a>
          . Powered by{' '}
          <a href="https://react.dev/" target="_blank" rel="noreferrer">
            React
          </a>
          ,{' '}
          <a href="https://vitejs.dev/" target="_blank" rel="noreferrer">
            Vite
          </a>
          ,{' '}
          <a href="https://tonejs.github.io/" target="_blank" rel="noreferrer">
            Tone.js
          </a>
          ,{' '}
          <a href="https://github.com/tonaljs/tonal" target="_blank" rel="noreferrer">
            Tonal
          </a>
          ,{' '}
          <a href="https://github.com/SleepingIRL/svguitar" target="_blank" rel="noreferrer">
            SVGuitar
          </a>
          ,{' '}
          <a href="https://github.com/moonwave99/fretboard.js" target="_blank" rel="noreferrer">
            Fretboard.js
          </a>
          , and{' '}
          <a href="https://www.vexflow.com/" target="_blank" rel="noreferrer">
            VexFlow
          </a>
          .
        </small>
      </section>
    </main>
  );
}
