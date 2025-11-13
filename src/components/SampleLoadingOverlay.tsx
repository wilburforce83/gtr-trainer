import { useSampleLoadState } from '../hooks/useSampleLoadState';

type Props = {
  message?: string;
};

export default function SampleLoadingOverlay({ message = 'Sample assets are loading…' }: Props) {
  const state = useSampleLoadState();
  if (state !== 'loading') {
    return null;
  }
  return (
    <div className="sample-overlay">
      <div className="sample-overlay__card">
        <p className="eyebrow">Preparing Audio</p>
        <p>{message}</p>
      </div>
    </div>
  );
}
