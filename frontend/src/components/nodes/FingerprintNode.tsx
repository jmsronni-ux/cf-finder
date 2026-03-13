import React, { useEffect, useRef } from 'react';
import { Handle } from 'reactflow';
import { gsap } from 'gsap';
import { Fingerprint, Lock, CheckCircle } from 'lucide-react';
import { HyperText } from '@/components/ui/hyper-text';

interface FingerprintNodeProps {
  id: string;
  data: {
    label: string;
    logo: string;
    blocked?: boolean;
    locked?: boolean;
    selected?: boolean;
    isVisible?: boolean;
    hasStarted?: boolean;
    effectiveStatus?: string;
    timeRemaining?: number;
    withdrawn?: boolean;
    level?: number;
    network?: string;
    user?: any;
    withdrawalSystem?: string;
    isAdmin?: boolean;
    transaction?: {
      id: string;
      date: string;
      transaction: string;
      amount: number;
      currency: string;
      status: string;
    };
    handles?: {
      target: {
        position: string;
      };
      source: {
        position: string;
      };
    };
    nodeProgressStatus?: string | null;
    dakLocked?: boolean;
  };
}

const FingerprintNode: React.FC<FingerprintNodeProps> = ({ id, data }) => {
  const getPosition = (position: string) => {
    switch (position.toLowerCase()) {
      case 'top':
        return 'top' as any;
      case 'right':
        return 'right' as any;
      case 'bottom':
        return 'bottom' as any;
      case 'left':
        return 'left' as any;
      default:
        return 'left' as any;
    }
  };

  const defaultHandles = {
    target: {
      position: 'left'
    },
    source: {
      position: 'right'
    }
  };

  const handles = data.handles || defaultHandles;
  const rootRef = useRef<HTMLDivElement>(null);
  const isDAK = data.withdrawalSystem === 'direct_access_keys';

  // Animate when node becomes visible
  useEffect(() => {
    if (!rootRef.current) return;

    // If node is locked (current level but not unlocked yet), show it immediately without animation
    if (data.locked) {
      gsap.set(rootRef.current, {
        opacity: 1,
        scale: 1,
      });
      return;
    }

    if (data.hasStarted && !data.isVisible) {
      // Hide initially
      gsap.set(rootRef.current, {
        opacity: 0,
        scale: 0.5,
      });
    } else if (data.isVisible) {
      // Animate in
      gsap.to(rootRef.current, {
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: 'back.out(1.7)',
      });
    }
  }, [data.isVisible, data.hasStarted, data.locked]);

  // ─── DAK STATUS STYLING (visible fills + glow) ───
  const getDakStatusStyling = () => {
    if (data.withdrawn) {
      return 'border-neutral-600/50 bg-neutral-800 opacity-40';
    }
    if (data.blocked) {
      return 'border-neutral-600 bg-neutral-800 opacity-70';
    }
    if (data.locked) {
      return 'border-neutral-600 bg-neutral-800 opacity-60';
    }
    if (data.selected) {
      return 'border-amber-400/60 bg-amber-950 ring-2 ring-amber-400/30';
    }

    // Explicit DAK progress statuses always take priority
    if (data.nodeProgressStatus === 'pending') {
      return 'border-amber-500/60 bg-amber-950 glow-yellow';
    }
    if (data.nodeProgressStatus === 'success') {
      return 'border-emerald-500/60 bg-emerald-950 glow-green';
    }
    if (data.nodeProgressStatus === 'fail') {
      return 'border-red-500/60 bg-red-950';
    }

    // For admins: show the transaction's own status
    // For regular users: no nodeProgressStatus yet → "Awaiting" (amber)
    if (data.isAdmin) {
      const status = data.effectiveStatus || data.transaction?.status;
      if (status === 'Success') return 'border-emerald-500/60 bg-emerald-950 glow-green';
      if (status === 'Fail') return 'border-red-500/60 bg-red-950';
      if (status === 'Pending') return 'border-amber-500/60 bg-amber-950 glow-yellow';
      if (status === 'Cold Wallet') return 'border-sky-500/60 bg-sky-950 glow-blue';
      if (status === 'Reported') return 'border-orange-500/60 bg-orange-950 glow-orange';
    }

    // Regular user: awaiting key generation (amber)
    if (data.nodeProgressStatus === null && !data.dakLocked) {
      return 'border-amber-500/60 bg-amber-950 glow-yellow';
    }

    return 'border-neutral-600/50 bg-neutral-800';
  };

  // ─── OLD DESIGN STATUS STYLING ───
  const getStatusStyling = () => {
    if (data.withdrawn) {
      return 'border-gray-500/60 bg-gray-600/30 opacity-40';
    }
    if (data.blocked) {
      return 'border-gray-500 bg-gray-600/40 opacity-70';
    }
    if (data.locked) {
      return 'border-gray-500 bg-gray-600/30 opacity-60';
    }
    if (data.selected) {
      return 'border-blue-400 bg-blue-600/30 glow-blue';
    }

    const status = data.effectiveStatus || data.transaction?.status;

    if (data.nodeProgressStatus === null && !data.dakLocked) {
      return 'border-yellow-500 bg-[#483413] glow-yellow text-yellow-500';
    }
    if (data.nodeProgressStatus === 'pending') {
      return 'border-yellow-500 bg-[#483413] glow-yellow text-yellow-500';
    }
    if (data.nodeProgressStatus === 'success') {
      return 'border-green-500 bg-[#1F582F] glow-green text-green-500';
    }
    if (data.nodeProgressStatus === 'fail') {
      return 'border-red-500 bg-[#4E1817] text-red-500';
    }

    if (status === 'Success') {
      return 'border-green-500 bg-[#1F582F] glow-green text-green-500';
    } else if (status === 'Fail') {
      return 'border-red-500 bg-[#4E1817] text-red-500';
    } else if (status === 'Pending') {
      return 'border-yellow-500 bg-[#483413] glow-yellow text-yellow-500';
    } else if (status === 'Cold Wallet') {
      return 'border-blue-500 bg-[#172554] glow-blue text-blue-500';
    } else if (status === 'Reported') {
      return 'border-orange-500 bg-[#431407] glow-orange text-orange-500';
    }

    return 'border-gray-500 bg-gray-600/40';
  };

  const getInnerBorderClass = () => {
    if (data.blocked) {
      return 'border-b-gray-500';
    }
    if (data.selected) {
      return 'border-b-blue-400';
    }

    const status = data.effectiveStatus || data.transaction?.status;

    if (data.nodeProgressStatus === null && !data.dakLocked) {
      return 'border-b-yellow-500';
    }
    if (data.nodeProgressStatus === 'pending') {
      return 'border-b-yellow-500';
    }
    if (data.nodeProgressStatus === 'success') {
      return 'border-b-green-500';
    }
    if (data.nodeProgressStatus === 'fail') {
      return 'border-b-red-500';
    }

    if (status === 'Success') {
      return 'border-b-green-500';
    } else if (status === 'Fail') {
      return 'border-b-red-500';
    } else if (status === 'Pending') {
      return 'border-b-yellow-500';
    } else if (status === 'Cold Wallet') {
      return 'border-b-blue-500';
    } else if (status === 'Reported') {
      return 'border-b-orange-500';
    }

    return 'border-b-gray-500';
  };


  return (
    <div
      ref={rootRef}
      className={`relative cursor-pointer border rounded-lg size-20 flex flex-col text-center transition-all duration-200 ${getStatusStyling()}`}
    >
      <Handle
        type="target"
        position={getPosition(handles.target.position)}
      />
      <div className="flex flex-col items-center gap-1 h-full">

        {data.blocked &&
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-black/85 rounded-lg flex items-center justify-center">
            <Lock />
          </div>
        }
        {data.locked &&
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-black/50 rounded-lg flex items-center justify-center">
            <Lock className="opacity-70" size={20} />
          </div>
        }

        <div className={`bg-black/50 w-full rounded-t-lg h-2/3 flex items-center justify-center border-b ${getInnerBorderClass()}`}>
          {data.isVisible && (
            <HyperText
              key={`${id}-${data.isVisible}`}
              className="text-[1.05rem] font-bold py-0 pointer-events-none"
              as="span"
              duration={2000}
              animateOnHover={false}
              startOnView={false}
              delay={400}
            >
              {`${(data.transaction?.amount || 0).toFixed(0)}`}
            </HyperText>
          )}
        </div>
        {data.withdrawn && (
          <div className="absolute -top-2 -right-2">
            <CheckCircle className="text-green-500" size={18} />
          </div>
        )}
        <span className="text-white/75 text-[0.65rem]">{data.transaction?.transaction.slice(0, 4)}...{data.transaction?.transaction.slice(-4)}</span>
      </div>
      <Handle
        type="source"
        position={getPosition(handles.source.position)}
      />
    </div>
  );
};

export default FingerprintNode;
