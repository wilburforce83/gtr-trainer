import SupportButton from './SupportButton';

interface Props {
  open: boolean;
  onClose(): void;
}

export default function SupportModal({ open, onClose }: Props) {
  if (!open) {
    return null;
  }
  return (
    <div className="support-modal__backdrop" role="dialog" aria-modal="true" aria-label="Support development">
      <div className="support-modal">
        <button type="button" className="ghost close" onClick={onClose} aria-label="Close support dialog">
          ✕
        </button>
        <p className="eyebrow">Support the project</p>
        <h3>Enjoying Guitar Theory Lab?</h3>
        <p>
          If these tools help your playing, please consider buying me a coffee. It keeps the lights on and lets me add new
          features.
        </p>
        <SupportButton variant="solid" label="Buy me a coffee" onClick={onClose} />
      </div>
    </div>
  );
}
