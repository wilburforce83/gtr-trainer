import { Link } from 'react-router-dom';

interface HeroCardProps {
  title: string;
  description: string;
  cta: string;
  to: string;
}

export default function HeroCard({ title, description, cta, to }: HeroCardProps) {
  return (
    <article className="hero-card">
      <header>
        <h2>{title}</h2>
      </header>
      <p>{description}</p>
      <div className="hero-card__actions">
        <Link to={to} className="hero-card__button">
          {cta}
        </Link>
      </div>
    </article>
  );
}
