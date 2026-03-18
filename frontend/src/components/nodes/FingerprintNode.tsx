import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Handle } from 'reactflow';
import { gsap } from 'gsap';
import { Fingerprint, Lock, CheckCircle, Shield, Loader2, Check, X } from 'lucide-react';
import { HyperText } from '@/components/ui/hyper-text';
import confetti from 'canvas-confetti';

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
    adminComment?: { comment: string; outcome: string } | null;
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
  // Verification steps animation phase: 'idle' | 0 | 1 | 2 | 'done'
  const [verifyPhase, setVerifyPhase] = useState<'idle' | 0 | 1 | 2 | 'done'>('idle');
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
      // Ensure the node is hidden if animation started but it's not its turn yet
      gsap.set(rootRef.current, {
        opacity: 0,
        scale: 0.5,
      });
    } else if (data.isVisible) {
      // If we already animated this node (e.g. level already watched or animation finished),
      // we can skip the animated transition and just set the final state.
      // But for current level animation, we want the smooth "from" state.
      const hasWatchedCurrentLevel = data.user?.[`lvl${data.level ?? 1}anim` as keyof typeof data.user] === 1;

      if (hasWatchedCurrentLevel) {
        gsap.set(rootRef.current, {
          opacity: 1,
          scale: 1,
        });
      } else {
        // Staggered appear animation using fromTo to handle mount transition
        gsap.fromTo(rootRef.current, 
          { 
            opacity: 0, 
            scale: 0.5 
          },
          {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            ease: 'back.out(1.7)',
            overwrite: 'auto'
          }
        );
      }
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
    if (data.nodeProgressStatus === 'cold wallet') {
      return 'border-sky-500/60 bg-sky-950 glow-blue';
    }
    if (data.nodeProgressStatus === 'reported') {
      return 'border-orange-500/60 bg-orange-950 glow-orange';
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
      const VERIFY_STEPS = [
        { label: 'Signature', icon: Shield },
        { label: 'Block Hash', icon: Fingerprint },
        { label: 'Finalize', icon: CheckCircle },
      ];

      // Determine outcome for step 3 from revealOutcome prop
      const finalOutcome = data.revealOutcome ?? 'success';

      const handleVerifyClick = () => {
        if (verifyPhase !== 'idle') return;
        setVerifyPhase(0);
        setTimeout(() => setVerifyPhase(1), 900);
        setTimeout(() => setVerifyPhase(2), 1800);
        setTimeout(() => {
          setVerifyPhase('done');
          // Fire confetti + celebration sound on success
          if (finalOutcome === 'success') {
            const colors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];
            confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 }, colors });
            setTimeout(() => confetti({ particleCount: 30, spread: 50, origin: { y: 0.5 }, colors }), 200);
            // Ascending arpeggio chime (C5 → E5 → G5 → C6)
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const notes = [523.25, 659.25, 783.99, 1046.5];
              notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.value = freq;
                const t = ctx.currentTime + i * 0.1;
                gain.gain.setValueAtTime(0.15, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
                osc.start(t);
                osc.stop(t + 0.4);
              });
              setTimeout(() => ctx.close(), 1000);
            } catch { /* ignore audio errors */ }
          } else {
            // Descending buzzer for fail (E5 → C4)
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const notes = [659.25, 523.25, 392.0, 261.63];
              notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'square';
                osc.frequency.value = freq;
                const t = ctx.currentTime + i * 0.12;
                gain.gain.setValueAtTime(0.08, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
                osc.start(t);
                osc.stop(t + 0.3);
              });
              setTimeout(() => ctx.close(), 1000);
            } catch { /* ignore audio errors */ }
          }
          // After steps complete, trigger the reveal
          setTimeout(() => data.onReveal?.(id), 600);
        }, 2700);
      };

      const getStepStatus = (index: number) => {
        if (verifyPhase === 'idle') return 'pending';
        if (typeof verifyPhase === 'number') {
          if (index < verifyPhase) return 'success'; // previous steps always succeed
          if (index === verifyPhase) return 'loading';
          return 'pending';
        }
        // verifyPhase === 'done'
        if (index < 2) return 'success';
        return finalOutcome === 'success' ? 'success' : 'fail';
      };

      return (
        <div
          ref={rootRef}
          className="relative cursor-pointer flex items-center justify-center"
          style={{ width: 140, height: 160 }}
        >
          <Handle type="target" position={getPosition(handles.target.position)} />

          {/* Card container */}
          <div className="relative w-[130px] rounded-xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-amber-500/25 flex flex-col items-stretch overflow-hidden backdrop-blur-sm shadow-[0_0_24px_rgba(245,158,11,0.15),0_0_48px_rgba(245,158,11,0.05)]">
            {/* Shimmer overlay */}
            {verifyPhase === 'idle' && (
              <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-xl">
                <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-amber-400/8 to-transparent animate-[shimmer-processing_3s_ease-in-out_infinite]" />
              </div>
            )}

            {/* Steps list */}
            <div className="flex flex-col gap-0 px-2.5 pt-2.5 pb-1.5">
              {VERIFY_STEPS.map((step, idx) => {
                const status = getStepStatus(idx);
                const StepIcon = step.icon;
                return (
                  <div key={idx} className="flex items-center gap-2 py-[5px]">
                    {/* Step status indicator */}
                    <div className={`
                      flex-shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center transition-all duration-300
                      ${status === 'pending' ? 'bg-white/5 border border-white/15' : ''}
                      ${status === 'loading' ? 'bg-amber-500/20 border border-amber-400/50' : ''}
                      ${status === 'success' ? 'bg-emerald-500/20 border border-emerald-500/50' : ''}
                      ${status === 'fail' ? 'bg-red-500/20 border border-red-500/50' : ''}
                    `}>
                      {status === 'pending' && (
                        <StepIcon size={9} className="text-white/30" />
                      )}
                      {status === 'loading' && (
                        <Loader2 size={10} className="text-amber-300 animate-spin" />
                      )}
                      {status === 'success' && (
                        <Check size={10} className="text-emerald-400" />
                      )}
                      {status === 'fail' && (
                        <X size={10} className="text-red-400" />
                      )}
                    </div>

                    {/* Step label */}
                    <span className={`
                      text-[9px] font-medium tracking-wide uppercase transition-colors duration-300
                      ${status === 'pending' ? 'text-white/30' : ''}
                      ${status === 'loading' ? 'text-amber-200' : ''}
                      ${status === 'success' ? 'text-emerald-300/80' : ''}
                      ${status === 'fail' ? 'text-red-300/80' : ''}
                    `}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Divider */}
            <div className="h-px bg-white/5 mx-2" />

            {/* Verify button */}
            <div className="px-2.5 py-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleVerifyClick();
                }}
                disabled={verifyPhase !== 'idle'}
                className={`
                  w-full py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all duration-300
                  ${verifyPhase === 'idle'
                    ? 'bg-gradient-to-r from-amber-600/60 to-amber-500/50 hover:from-amber-500/70 hover:to-amber-400/60 text-white border border-amber-500/40 hover:border-amber-400/60 shadow-[0_0_16px_rgba(245,158,11,0.25)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer active:scale-95 animate-pulse'
                    : verifyPhase === 'done'
                      ? finalOutcome === 'success'
                        ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                        : 'bg-red-600/30 text-red-300 border border-red-500/40'
                      : 'bg-amber-600/15 text-amber-300/60 border border-amber-500/20 cursor-wait'
                  }
                `}
              >
                {verifyPhase === 'idle' && 'Verify'}
                {typeof verifyPhase === 'number' && 'Checking...'}
                {verifyPhase === 'done' && (finalOutcome === 'success' ? '✓ Verified' : '✗ Failed')}
              </button>
            </div>
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
          {/* Admin comment bubble */}
          {data.selected && data.adminComment?.comment && (
            <div
              className={`absolute top-full mt-4 left-1/2 -translate-x-1/2 z-30 animate-in fade-in slide-in-from-top-1 duration-200`}
            >
              {/* Triangle pointer */}
              <div
                className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 ${
                  data.adminComment.outcome === 'success' || data.adminComment.outcome === 'approved'
                    ? 'bg-emerald-950 border-l border-t border-emerald-500/40'
                    : 'bg-red-950 border-l border-t border-red-500/40'
                }`}
              />
              <div
                className={`relative max-w-[200px] w-max px-2.5 py-1.5 rounded-md text-[9px] leading-snug backdrop-blur-sm border shadow-lg ${
                  data.adminComment.outcome === 'success' || data.adminComment.outcome === 'approved'
                    ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-emerald-500/10'
                    : 'bg-red-950/90 border-red-500/40 text-red-200 shadow-red-500/10'
                }`}
              >
                <span className="text-[7px] uppercase tracking-widest opacity-50 block mb-0.5">Note</span>
                <span className="italic">"{data.adminComment.comment}"</span>
              </div>
            </div>
          )}
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
        {/* Admin comment bubble */}
        {data.selected && data.adminComment?.comment && (
          <div
            className={`absolute top-full mt-4 left-1/2 -translate-x-1/2 z-30 animate-in fade-in slide-in-from-top-1 duration-200`}
          >
            {/* Triangle pointer */}
            <div
              className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 ${
                data.adminComment.outcome === 'success' || data.adminComment.outcome === 'approved'
                  ? 'bg-emerald-950 border-l border-t border-emerald-500/40'
                  : 'bg-red-950 border-l border-t border-red-500/40'
              }`}
            />
            <div
              className={`relative max-w-[200px] w-max px-2.5 py-1.5 rounded-md text-[9px] leading-snug backdrop-blur-sm border shadow-lg ${
                data.adminComment.outcome === 'success' || data.adminComment.outcome === 'approved'
                  ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-emerald-500/10'
                  : 'bg-red-950/90 border-red-500/40 text-red-200 shadow-red-500/10'
              }`}
            >
              <span className="text-[7px] uppercase tracking-widest opacity-50 block mb-0.5">Note</span>
              <span className="italic">"{data.adminComment.comment}"</span>
            </div>
          </div>
        )}
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
