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
    </main>
  );
}
