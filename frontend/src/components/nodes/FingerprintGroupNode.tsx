import React, { useRef, useEffect } from 'react';
import { Handle } from 'reactflow';
import { gsap } from 'gsap';
import { Layers, Lock } from 'lucide-react';
import { HyperText } from '@/components/ui/hyper-text';

interface FingerprintGroupNodeProps {
  id: string;
  data: {
    label: string;
    logo?: string;
    blocked?: boolean;
    locked?: boolean;
    selected?: boolean;
    isVisible?: boolean;
    hasStarted?: boolean;
    isAdmin?: boolean;
    handles?: {
      target: {
        position: string;
      };
      source: {
        position: string;
      };
    };
    // Sum of all child fingerprint node amounts
    aggregatedAmount?: number;
    childCount?: number;
    nodeProgressStatus?: string | null;
    dakLocked?: boolean;
  };
}

const FingerprintGroupNode: React.FC<FingerprintGroupNodeProps> = ({ id, data }) => {
  const getPosition = (position: string) => {
    switch (position.toLowerCase()) {
      case 'top': return 'top' as any;
      case 'right': return 'right' as any;
      case 'bottom': return 'bottom' as any;
      case 'left': return 'left' as any;
      default: return 'left' as any;
    }
  };

  const defaultHandles = {
    target: { position: 'left' },
    source: { position: 'right' }
  };

  const handles = data.handles || defaultHandles;
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    if (data.locked) {
      gsap.set(rootRef.current, { opacity: 1, scale: 1 });
      return;
    }
    if (data.hasStarted && !data.isVisible) {
      gsap.set(rootRef.current, { opacity: 0, scale: 0.5 });
    } else if (data.isVisible) {
      gsap.to(rootRef.current, {
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: 'back.out(1.7)',
      });
    }
  }, [data.isVisible, data.hasStarted, data.locked]);

  const getStatusStyling = () => {
    if (data.blocked) return 'border-neutral-600 bg-neutral-800 opacity-70';
    if (data.locked) return 'border-neutral-600 bg-neutral-800 opacity-60';
    if (data.selected) return 'border-purple-400 bg-neutral-800 ring-2 ring-purple-400/30';
    
    if (data.nodeProgressStatus === 'pending') return 'border-amber-500/60 bg-amber-950 glow-yellow';
    if (data.nodeProgressStatus === 'success') return 'border-emerald-500/60 bg-emerald-950 glow-green';
    
    return 'border-purple-500/40 bg-purple-950/20';
  };

  return (
    <div
      ref={rootRef}
      className={`relative cursor-pointer border rounded-2xl size-24 flex flex-col items-center justify-center text-center transition-all duration-200 ${getStatusStyling()}`}
    >
      <Handle type="target" position={getPosition(handles.target.position)} />
      
      <div className="flex flex-col items-center justify-center gap-1 h-full p-2">
        <Layers className="text-purple-400 opacity-70 mb-1" size={16} />
        
        {data.isVisible && (
          <HyperText
            key={`${id}-amount-${data.aggregatedAmount}-${data.childCount}`}
            className="text-[1.1rem] font-bold py-0 pointer-events-none text-white font-mono"
            as="span"
            duration={1500}
            animateOnHover={false}
            startOnView={false}
            delay={200}
          >
            {`${(data.aggregatedAmount || 0).toFixed(0)}`}
          </HyperText>
        )}
        
        <div className="flex flex-col">
          <span className="text-white/40 text-[0.6rem] uppercase tracking-wider font-bold">
            {data.childCount || 0} NODES
          </span>
          <span className="text-purple-400/60 text-[0.55rem] font-medium tracking-tighter">
            GROUP BUNDLE
          </span>
        </div>

        {data.locked && (
          <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center z-10">
            <Lock className="text-neutral-500" size={14} />
          </div>
        )}
      </div>

      <Handle type="source" position={getPosition(handles.source.position)} />
      
      {/* Decorative corners */}
      <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-purple-500/40" />
      <div className="absolute -top-1 -right-1 w-2 h-2 border-t border-r border-purple-500/40" />
      <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b border-l border-purple-500/40" />
      <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-purple-500/40" />
    </div>
  );
};

export default FingerprintGroupNode;
