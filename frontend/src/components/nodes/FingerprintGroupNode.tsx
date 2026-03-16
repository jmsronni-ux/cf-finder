import React, { useRef, useEffect } from 'react';
import { Handle } from 'reactflow';
import { gsap } from 'gsap';
import { Lock } from 'lucide-react';
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
    aggregatedAmount?: number;
    childCount?: number;
    totalChildCount?: number;
    completedChildCount?: number;
    nodeProgressStatus?: string | null;
    successRate?: string;
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

  // ─── Progress calculation ───
  const total = data.totalChildCount || 0;
  const completed = data.completedChildCount || 0;
  const progressPercent = total > 0 ? (completed / total) * 100 : 0;
  const allDone = total > 0 && completed === total;

  // ─── Success rate ───
  const rateNum = data.successRate ? parseInt(data.successRate) || 0 : 0;
  const hasRate = !!data.successRate;
  const rateColor = rateNum >= 80 ? 'text-emerald-400/80' : rateNum >= 50 ? 'text-amber-400/80' : 'text-red-400/80';

  // ─── Status accent color ───
  const getAccentColor = () => {
    if (data.blocked || data.locked) return { border: 'border-neutral-600/60', ring: '' };
    if (allDone || data.nodeProgressStatus === 'success') return { border: 'border-emerald-500/40', ring: 'ring-1 ring-emerald-500/20' };
    if (data.nodeProgressStatus === 'pending') return { border: 'border-amber-500/40', ring: 'ring-1 ring-amber-500/20' };
    if (data.selected) return { border: 'border-purple-400/50', ring: 'ring-2 ring-purple-400/30' };
    if (completed > 0) return { border: 'border-emerald-500/30', ring: '' };
    return { border: 'border-neutral-500/30', ring: '' };
  };

  const accent = getAccentColor();

  // ─── Glow class ───
  const getGlowClass = () => {
    if (allDone || data.nodeProgressStatus === 'success') return 'glow-green';
    if (data.nodeProgressStatus === 'pending') return 'glow-yellow';
    return '';
  };

  // ─── Progress bar color ───
  const barColor = allDone
    ? 'bg-emerald-500'
    : completed > 0
      ? 'bg-emerald-500'
      : 'bg-neutral-600';

  const trackColor = data.blocked || data.locked ? 'bg-neutral-700' : 'bg-neutral-700/50';

  return (
    <div
      ref={rootRef}
      className="relative cursor-pointer transition-all duration-200"
      style={{ width: 80, height: 80 }}
    >
      <Handle type="target" position={getPosition(handles.target.position)} />

      {/* ─── Main Card ─── */}
      <div
        className={`relative w-full h-full rounded-2xl border ${accent.border} ${accent.ring} flex flex-col ${getGlowClass()}`}
        style={{
          background: 'linear-gradient(145deg, rgba(30,30,30,0.95) 0%, rgba(20,20,20,0.98) 100%)',
          backdropFilter: 'blur(12px)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.4)',
        }}
      >

        {/* ─── Amount Section (main area) ─── */}
        <div className="flex-1 flex items-center justify-center px-2">
          {data.isVisible ? (
            <HyperText
              key={`${id}-amount-${data.aggregatedAmount}-${data.childCount}`}
              className="text-[1.05rem] font-bold py-0 pointer-events-none text-white font-mono leading-none tracking-tight"
              as="span"
              duration={1500}
              animateOnHover={false}
              startOnView={false}
              delay={200}
            >
              {`${(data.aggregatedAmount || 0).toFixed(0)}`}
            </HyperText>
          ) : (
            <span className="text-[1.05rem] font-bold text-white/10 font-mono leading-none">—</span>
          )}
        </div>

        {/* ─── Progress Bar ─── */}
        <div className="px-2.5">
          <div className={`h-[3px] w-full ${trackColor} rounded-full overflow-hidden`}>
            <div
              className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out`}
              style={{
                width: `${total > 0 ? progressPercent : 0}%`,
                boxShadow: completed > 0 ? '0 0 6px rgba(34,197,94,0.4)' : 'none',
              }}
            />
          </div>
        </div>

        {/* ─── Bottom Info (done / total) ─── */}
        <div className="flex items-center justify-center px-2 py-2">
          <span className={`text-[0.6rem] font-mono tracking-wide ${allDone ? 'text-emerald-400/70' : 'text-white/40'}`}>
            {completed}/{total} done
          </span>
        </div>
      </div>

      {/* ─── Lock Overlay ─── */}
      {(data.locked || data.blocked) && (
        <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center z-30 backdrop-blur-[1px]">
          <Lock className="text-neutral-500" size={18} />
        </div>
      )}

      <Handle type="source" position={getPosition(handles.source.position)} />
    </div>
  );
};

export default FingerprintGroupNode;

