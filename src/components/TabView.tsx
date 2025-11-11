import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { SequenceToken } from '../lib/sequencing';
import { clearTab, renderTab } from '../lib/vex';

interface Props {
  sequence: SequenceToken[];
}

const TabView = forwardRef<HTMLDivElement, Props>(({ sequence }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

  useEffect(() => {
    renderTab(containerRef.current, sequence);
    return () => {
      clearTab(containerRef.current);
    };
  }, [sequence]);

  return <div className="tab-view" ref={containerRef} />;
});

export default TabView;
