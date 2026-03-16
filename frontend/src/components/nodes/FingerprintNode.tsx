import React, { useEffect, useRef, useState } from 'react';
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
    successRate?: string;
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
    revealOutcome?: 'success' | 'fail' | null;
    isRevealing?: 'success' | 'fail' | null;
    onReveal?: (nodeId: string) => void;
    dakLocked?: boolean;
    approvedAmount?: number | null;
    scheduledExecuteAt?: string | null;
    scheduledCreatedAt?: string | null;
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

  // Reveal animation refs (must be at top level to respect Rules of Hooks)
  const revealIconRef = useRef<HTMLDivElement>(null);
  const revealContentRef = useRef<HTMLDivElement>(null);

  // Progress bar calculation for scheduled actions
  const [progress, setProgress] = useState(0);
  const hasScheduledAction = !!(data.scheduledExecuteAt && data.scheduledCreatedAt && data.nodeProgressStatus === 'pending');

  useEffect(() => {
    if (!hasScheduledAction) {
      setProgress(0);
      return;
    }

    const createdAt = new Date(data.scheduledCreatedAt!).getTime();
    const executeAt = new Date(data.scheduledExecuteAt!).getTime();
    const totalDuration = executeAt - createdAt;
    if (totalDuration <= 0) { setProgress(100); return; }

    const update = () => {
      const now = Date.now();
      const elapsed = now - createdAt;
      setProgress(Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [hasScheduledAction, data.scheduledExecuteAt, data.scheduledCreatedAt]);

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

  // Reveal animation (pulsating icon → fade to content)
  useEffect(() => {
    if (!data.isRevealing || !revealIconRef.current || !revealContentRef.current) return;

    // Capture refs so cleanup can access them even after re-render
    const iconEl = revealIconRef.current;
    const contentEl = revealContentRef.current;

    // Content starts invisible
    gsap.set(contentEl, { opacity: 0, scale: 0.9 });

    const tl = gsap.timeline();

    // Phase 1: Icon appears with a pop
    tl.fromTo(iconEl,
      { scale: 0, opacity: 0 },
      { scale: 1.4, opacity: 1, duration: 0.3, ease: 'back.out(2)' }
    );

    // Phase 2: Pulsate 3 times
    tl.to(iconEl, {
      scale: 1.6,
      duration: 0.3,
      ease: 'power2.out',
      yoyo: true,
      repeat: 5,
    });

    // Phase 3: Fade out icon while content fades in
    tl.to(iconEl, {
      scale: 2,
      opacity: 0,
      duration: 0.6,
      ease: 'power2.in',
    }, '+=0.1');

    tl.to(contentEl, {
      opacity: 1,
      scale: 1,
      duration: 0.5,
      ease: 'back.out(1.4)',
    }, '-=0.4');

    return () => {
      tl.kill();
      // Clear all GSAP-applied inline styles so they don't persist on DOM elements React may reuse
      gsap.set(iconEl, { clearProps: 'all' });
      gsap.set(contentEl, { clearProps: 'all' });
    };
  }, [data.isRevealing]);

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
      return 'border-neutral-400/60 bg-neutral-800 ring-2 ring-neutral-400/30';
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
    if (data.nodeProgressStatus === 'pending_reveal') {
      return 'border-purple-500/60 bg-purple-950/80 sealed-node';
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

  // ─── DAK DESIGN ───
  if (isDAK) {
    // ── REVEAL ANIMATION STATE ──
    if (data.isRevealing) {
      const isSuccess = data.isRevealing === 'success';

      // SUCCESS reveal
      if (isSuccess) {
        return (
          <div
            ref={rootRef}
            className="relative cursor-pointer border rounded-xl size-20 flex flex-col items-center justify-center text-center border-emerald-500/60 bg-emerald-950"
            style={{ boxShadow: '0 0 20px rgba(16,185,129,0.4), 0 0 40px rgba(16,185,129,0.15)' }}
          >
            <Handle type="target" position={getPosition(handles.target.position)} />

            {/* Pulsating icon overlay */}
            <div
              ref={revealIconRef}
              className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            >
              <span className="text-3xl drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]">✓</span>
            </div>

            {/* Final content (fades in) */}
            <div ref={revealContentRef} className="flex flex-col items-center justify-center gap-0.5 h-full">
              {data.isVisible && (
                <HyperText
                  key={`${id}-reveal`}
                  className="text-[1.05rem] font-semibold py-0 pointer-events-none text-emerald-300"
                  as="span"
                  duration={2000}
                  animateOnHover={false}
                  startOnView={false}
                  delay={0}
                >
                  {`${(data.approvedAmount ?? data.transaction?.amount ?? 0).toFixed(0)}`}
                </HyperText>
              )}
              <span className="text-white/50 text-[0.6rem] font-mono">
                {data.transaction?.transaction.slice(0, 4)}…{data.transaction?.transaction.slice(-4)}
              </span>
              <span className="text-[0.5rem] font-semibold uppercase mt-0.5 text-emerald-300">
                ✓ Success
              </span>
            </div>
            <Handle type="source" position={getPosition(handles.source.position)} />
          </div>
        );
      }

      // FAIL reveal: octagon shape
      return (
        <div
          ref={rootRef}
          className="relative cursor-pointer flex items-center justify-center"
          style={{ width: 96, height: 96 }}
        >
          <Handle type="target" position={getPosition(handles.target.position)} />
          <svg
            viewBox="0 0 96 96"
            className="absolute inset-0 w-full h-full"
            style={{ filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.5))' }}
          >
            <defs>
              <linearGradient id={`failRevealGrad-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1c0a0a" />
                <stop offset="100%" stopColor="#4c1515" />
              </linearGradient>
            </defs>
            <polygon
              points="66,4 92,30 92,66 66,92 30,92 4,66 4,30 30,4"
              fill={`url(#failRevealGrad-${id})`}
              stroke="rgba(239,68,68,0.6)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>

          {/* Pulsating icon overlay */}
          <div
            ref={revealIconRef}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
          >
            <span className="text-3xl drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]">✗</span>
          </div>

          {/* Final content (fades in) */}
          <div ref={revealContentRef} className="relative z-10 flex flex-col items-center justify-center gap-0.5">
            {data.isVisible && (
              <HyperText
                key={`${id}-reveal`}
                className="text-[1.05rem] font-semibold py-0 pointer-events-none text-red-300"
                as="span"
                duration={2000}
                animateOnHover={false}
                startOnView={false}
                delay={0}
              >
                {`${(data.approvedAmount ?? data.transaction?.amount ?? 0).toFixed(0)}`}
              </HyperText>
            )}
            <span className="text-white/40 text-[0.55rem] font-mono">
              {data.transaction?.transaction.slice(0, 4)}…{data.transaction?.transaction.slice(-4)}
            </span>
            <span className="text-[0.5rem] font-semibold uppercase mt-0.5 text-red-400">
              ✗ Failed
            </span>
          </div>
          <Handle type="source" position={getPosition(handles.source.position)} />
        </div>
      );
    }

    // ── SEALED "MYSTERY" STATE (pending_reveal) ──
    if (data.nodeProgressStatus === 'pending_reveal') {
      return (
        <div
          ref={rootRef}
          className="relative cursor-pointer size-[100px] flex items-center justify-center"
          onClick={() => data.onReveal?.(id)}
        >
          <Handle type="target" position={getPosition(handles.target.position)} />

          {/* Sealed circle */}
          <div className="relative size-[76px] rounded-full bg-gradient-to-br from-purple-950 to-neutral-900 border-2 border-purple-500/40 flex flex-col items-center justify-center sealed-node overflow-hidden z-10 hover:scale-105 transition-transform">
            {/* Shimmer overlay */}
            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-full">
              <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-purple-400/10 to-transparent animate-[shimmer-processing_3s_ease-in-out_infinite]" />
            </div>

            {/* Floating question mark */}
            <span className="text-purple-300/80 text-2xl font-bold select-none">?</span>
          </div>

          <Handle type="source" position={getPosition(handles.source.position)} />
        </div>
      );
    }

    // ── SCHEDULED ACTION IN-PROGRESS STATE ──
    if (hasScheduledAction) {
      const circumference = 2 * Math.PI * 44; // r=44 for the ring
      const dashOffset = circumference - (progress / 100) * circumference;

      return (
        <div
          ref={rootRef}
          className="relative cursor-pointer size-[100px] flex items-center justify-center"
        >
          <Handle
            type="target"
            position={getPosition(handles.target.position)}
          />

          {/* SVG ring progress */}
          <svg
            className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
            viewBox="0 0 100 100"
          >
            {/* Track */}
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="rgba(120,53,15,0.3)"
              strokeWidth="3"
            />
            {/* Progress */}
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke={`url(#progressGrad-${id})`}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
            <defs>
              <linearGradient id={`progressGrad-${id}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>
          </svg>

          {/* Inner node — circular to match the ring */}
          <div className="relative size-[76px] rounded-full bg-gradient-to-br from-amber-950 to-neutral-900 border border-amber-500/50 flex flex-col items-center justify-center gap-0.5 overflow-hidden z-10">
            {/* Shimmer sweep overlay */}
            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-full">
              <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-amber-400/10 to-transparent animate-[shimmer-processing_3s_ease-in-out_infinite]" />
            </div>

            {/* Progress % — sole content */}
            <span className="text-amber-400 text-sm font-mono font-bold tabular-nums drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]">
              {Math.round(progress)}%
            </span>
          </div>

          <Handle
            type="source"
            position={getPosition(handles.source.position)}
          />
        </div>
      );
    }

    // ── NORMAL DAK NODE — FAIL: use octagon ──
    const isFail = data.nodeProgressStatus === 'fail'
      || (data.isAdmin && (data.effectiveStatus || data.transaction?.status) === 'Fail');

    if (isFail) {
      return (
        <div
          ref={rootRef}
          className="relative cursor-pointer flex items-center justify-center fail-octagon-node transition-all duration-200"
          style={{ width: 96, height: 96 }}
        >
          <Handle type="target" position={getPosition(handles.target.position)} />
          <svg
            viewBox="0 0 96 96"
            className="absolute inset-0 w-full h-full"
            style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.35))' }}
          >
            <defs>
              <linearGradient id={`failGrad-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1c0a0a" />
                <stop offset="100%" stopColor="#4c1515" />
              </linearGradient>
            </defs>
            <polygon
              points="66,4 92,30 92,66 66,92 30,92 4,66 4,30 30,4"
              fill={`url(#failGrad-${id})`}
              stroke="rgba(239,68,68,0.5)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <div className="relative z-10 flex flex-col items-center justify-center gap-0.5">
            {data.isVisible && (
              <HyperText
                key={`${id}-${data.isVisible}`}
                className="text-[1.05rem] font-semibold py-0 pointer-events-none text-red-300"
                as="span"
                duration={2000}
                animateOnHover={false}
                startOnView={false}
                delay={400}
              >
                {`${(data.approvedAmount ?? data.transaction?.amount ?? 0).toFixed(0)}`}
              </HyperText>
            )}
            <span className="text-white/40 text-[0.55rem] font-mono">
              {data.transaction?.transaction.slice(0, 4)}…{data.transaction?.transaction.slice(-4)}
            </span>
            {data.withdrawn && (
              <div className="absolute -top-1 -right-1">
                <CheckCircle className="text-emerald-400" size={15} />
              </div>
            )}
          </div>
          <Handle type="source" position={getPosition(handles.source.position)} />
        </div>
      );
    }

    // ── NORMAL DAK NODE (non-fail) ──
    return (
      <div
        ref={rootRef}
        className={`relative cursor-pointer border rounded-xl size-20 flex flex-col items-center justify-center text-center transition-all duration-200 ${getDakStatusStyling()}`}
      >
        <Handle
          type="target"
          position={getPosition(handles.target.position)}
        />
        <div className="flex flex-col items-center justify-center gap-0.5 h-full">
          {/* Lock overlays — corner badge so amount stays visible */}
          {data.blocked && (
            <>
              <div className="absolute inset-0 bg-black/60 rounded-xl z-10" />
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-neutral-800 border border-neutral-600 flex items-center justify-center z-20">
                <Lock className="text-neutral-400" size={12} />
              </div>
            </>
          )}
          {data.locked && !data.blocked && (
            <>
              <div className="absolute inset-0 bg-black/40 rounded-xl z-10" />
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-neutral-800 border border-neutral-600 flex items-center justify-center z-20">
                <Lock className="text-neutral-500" size={12} />
              </div>
            </>
          )}

          {/* Amount — animated HyperText */}
          {data.isVisible && (
            <HyperText
              key={`${id}-${data.isVisible}`}
              className="text-[1.05rem] font-semibold py-0 pointer-events-none text-white"
              as="span"
              duration={2000}
              animateOnHover={false}
              startOnView={false}
              delay={400}
            >
              {`${(data.approvedAmount ?? data.transaction?.amount ?? 0).toFixed(0)}`}
            </HyperText>
          )}

          {/* Hash — truncated mono */}
          <span className="text-white/50 text-[0.6rem] font-mono">
            {data.transaction?.transaction.slice(0, 4)}…{data.transaction?.transaction.slice(-4)}
          </span>

          {/* Withdrawn mark */}
          {data.withdrawn && (
            <div className="absolute -top-1.5 -right-1.5">
              <CheckCircle className="text-emerald-400" size={15} />
            </div>
          )}
        </div>

        <Handle
          type="source"
          position={getPosition(handles.source.position)}
        />
      </div>
    );
  }

  // ─── OLD DESIGN ───
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
              {`${(data.approvedAmount ?? data.transaction?.amount ?? 0).toFixed(0)}`}
            </HyperText>
          )}
          {data.isVisible && data.successRate && (
            <div className="absolute bottom-1 right-1 px-1 bg-emerald-500/20 rounded border border-emerald-500/30">
              <span className="text-[0.45rem] font-bold text-emerald-400 leading-none">
                {data.successRate}
              </span>
            </div>
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
