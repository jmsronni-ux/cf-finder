import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ChevronDown, ChevronUp, Bell, BellOff, CheckCircle2 } from 'lucide-react';
// @ts-ignore
import { useReactFlow } from 'reactflow';

interface ScheduledAction {
  executeAt: string;
  createdAt: string;
  nodeStatusOutcome: string;
}

interface InProgressPanelProps {
  nodeScheduledActions: Record<string, ScheduledAction>;
  nodes: any[];
  pendingRevealNodes: Record<string, 'success' | 'fail'>;
  onReveal: (nodeId: string) => void;
}

// ─── Sound Utility ───
function playChime(type: 'success' | 'fail') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';

    if (type === 'success') {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(659.25, ctx.currentTime + 0.15);
    } else {
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(523.25, ctx.currentTime + 0.15);
    }

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
    setTimeout(() => ctx.close(), 300);
  } catch { /* ignore audio errors */ }
}

// ─── Progress Hook ───
function useProgress(createdAt: string, executeAt: string) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = new Date(createdAt).getTime();
    const end = new Date(executeAt).getTime();
    const total = end - start;
    if (total <= 0) { setProgress(100); return; }

    const update = () => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(100, Math.max(0, (elapsed / total) * 100)));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [createdAt, executeAt]);

  return progress;
}

function formatApproxTime(ms: number): string {
  if (ms <= 0) return 'Almost done';
  const totalSecs = Math.ceil(ms / 1000);
  if (totalSecs < 60) return '~less than a min';
  const mins = Math.round(totalSecs / 60);
  if (mins < 60) return `~${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs === 1) return '~1 hour';
  return `~${hrs} hours`;
}

// ─── Unified Row (handles both in-progress and ready-to-reveal) ───
const ProgressRow: React.FC<{
  nodeId: string;
  label: string;
  amount: number;
  createdAt: string;
  executeAt: string;
  isReady: boolean; // true = completed, ready to reveal (purple state)
  onFocus: (nodeId: string) => void;
  onReveal?: (nodeId: string) => void;
}> = ({ nodeId, label, amount, createdAt, executeAt, isReady, onFocus, onReveal }) => {
  const progress = useProgress(createdAt, executeAt);
  const end = new Date(executeAt).getTime();
  const remaining = Math.max(0, end - Date.now());

  // Determine color scheme: amber for in-progress, purple for ready-to-reveal
  const dotColor = isReady ? 'bg-purple-400' : 'bg-amber-400';
  const textColor = isReady ? 'text-purple-400' : 'text-amber-400';
  const gradientBg = isReady
    ? 'linear-gradient(90deg, #a855f7, #7c3aed)'
    : 'linear-gradient(90deg, #f59e0b, #f97316)';
  const hoverBg = isReady ? 'hover:bg-purple-500/[0.06]' : 'hover:bg-white/[0.03]';

  return (
    <div
      className={`py-3 px-5 border-b border-white/[0.04] last:border-b-0 cursor-pointer transition-colors ${hoverBg}`}
      onClick={() => {
        if (isReady && onReveal) {
          onFocus(nodeId);
          setTimeout(() => onReveal(nodeId), 600);
        } else {
          onFocus(nodeId);
        }
      }}
      title={isReady ? 'Click to reveal result' : 'Click to focus on node'}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex-shrink-0">
            <div className={`w-2 h-2 rounded-full ${dotColor}`} />
            {!isReady && (
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-amber-400 animate-ping opacity-40" />
            )}
          </div>
          <span className="text-neutral-300 text-xs truncate">{label || nodeId}</span>
        </div>
        <span className={`text-xs font-mono font-semibold tabular-nums ml-3 flex-shrink-0 ${textColor}`}>
          {isReady ? 'Tap to open' : `${Math.round(progress)}%`}
        </span>
      </div>
      {/* Progress bar — always shown, purple when at 100% */}
      <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden ml-[18px]" style={{ width: 'calc(100% - 18px)' }}>
        <div
          className="h-full rounded-full transition-[width] duration-1000 ease-linear"
          style={{ width: isReady ? '100%' : `${progress}%`, background: gradientBg }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5 ml-[18px]">
        <span className="text-neutral-600 text-[11px] font-mono">${amount.toFixed(0)}</span>
        <span className={`text-[11px] ${isReady ? 'text-purple-500/60' : 'text-neutral-600'}`}>
          {isReady ? 'Complete' : formatApproxTime(remaining)}
        </span>
      </div>
    </div>
  );
};

// ─── Summary Bar ───
const SummaryBar: React.FC<{ items: { createdAt: string; executeAt: string }[]; revealCount: number }> = ({ items, revealCount }) => {
  const [avgProgress, setAvgProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const totalItems = items.length + revealCount;
      if (totalItems === 0) { setAvgProgress(0); return; }
      let total = revealCount * 100; // reveal items are 100%
      items.forEach(item => {
        const start = new Date(item.createdAt).getTime();
        const end = new Date(item.executeAt).getTime();
        const duration = end - start;
        if (duration <= 0) { total += 100; return; }
        const elapsed = Date.now() - start;
        total += Math.min(100, Math.max(0, (elapsed / duration) * 100));
      });
      setAvgProgress(total / totalItems);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [items, revealCount]);

  const totalCount = items.length + revealCount;

  return (
    <div className="mt-3">
      <div className="w-full h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-1000 ease-linear"
          style={{ width: `${avgProgress}%`, background: 'linear-gradient(90deg, rgba(255,255,255,0.2), rgba(255,255,255,0.5))' }}
        />
      </div>
      <p className="text-neutral-600 text-[11px] mt-1.5">
        {totalCount} node{totalCount !== 1 ? 's' : ''} · {Math.round(avgProgress)}% overall
      </p>
    </div>
  );
};

// ─── Main Panel ───
const InProgressPanel: React.FC<InProgressPanelProps> = ({ nodeScheduledActions, nodes, pendingRevealNodes, onReveal }) => {
  const [expanded, setExpanded] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const reactFlow = useReactFlow();

  // Sound toggle (persisted)
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem('cfinder_progress_sound') !== 'off'; }
    catch { return true; }
  });
  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev;
      try { localStorage.setItem('cfinder_progress_sound', next ? 'on' : 'off'); } catch { }
      return next;
    });
  }, []);

  // Sound on new reveal items
  const prevRevealCountRef = useRef(Object.keys(pendingRevealNodes).length);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  useEffect(() => {
    const count = Object.keys(pendingRevealNodes).length;
    if (count > prevRevealCountRef.current && soundEnabledRef.current) {
      playChime('success');
    }
    prevRevealCountRef.current = count;
  }, [pendingRevealNodes]);

  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const hadItemsRef = useRef(false);

  // Build in-progress items
  const items = useMemo(() => {
    return Object.entries(nodeScheduledActions)
      .filter(([nodeId]) => {
        const node = nodes.find((n: any) => n.id === nodeId);
        return node?.type !== 'fingerprintGroupNode';
      })
      .map(([nodeId, sa]) => {
        const node = nodes.find((n: any) => n.id === nodeId);
        return {
          nodeId,
          label: node?.data?.transaction?.transaction
            ? `${node.data.transaction.transaction.slice(0, 6)}…${node.data.transaction.transaction.slice(-4)}`
            : nodeId,
          amount: node?.data?.transaction?.amount || 0,
          createdAt: sa.createdAt,
          executeAt: sa.executeAt,
          isReady: false,
        };
      })
      .sort((a, b) => new Date(a.executeAt).getTime() - new Date(b.executeAt).getTime());
  }, [nodeScheduledActions, nodes]);

  // Build reveal items (same shape, isReady = true)
  const revealItems = useMemo(() => {
    return Object.entries(pendingRevealNodes)
      .filter(([nodeId]) => {
        const node = nodes.find((n: any) => n.id === nodeId);
        return node?.type !== 'fingerprintGroupNode';
      })
      .map(([nodeId]) => {
        const node = nodes.find((n: any) => n.id === nodeId);
        return {
          nodeId,
          label: node?.data?.transaction?.transaction
            ? `${node.data.transaction.transaction.slice(0, 6)}…${node.data.transaction.transaction.slice(-4)}`
            : nodeId,
          amount: node?.data?.transaction?.amount || 0,
          createdAt: new Date().toISOString(),
          executeAt: new Date().toISOString(),
          isReady: true,
        };
      });
  }, [pendingRevealNodes, nodes]);

  // Merge: in-progress first, then ready-to-reveal
  const allItems = [...revealItems, ...items];

  // Track if we had items
  useEffect(() => {
    if (allItems.length > 0) hadItemsRef.current = true;
  }, [allItems.length]);

  // Celebration: when everything is done
  useEffect(() => {
    if (allItems.length === 0 && hadItemsRef.current) {
      setShowCelebration(true);
      const timer = setTimeout(() => {
        setShowCelebration(false);
        hadItemsRef.current = false;
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [allItems.length]);

  // Measure content height
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [allItems, showCelebration]);

  // Click to focus handler
  const handleFocus = useCallback((nodeId: string) => {
    const node = nodes.find((n: any) => n.id === nodeId);
    if (node?.position) {
      reactFlow.setCenter(node.position.x + 40, node.position.y + 40, {
        zoom: 1.3,
        duration: 800,
      });
    }
  }, [nodes, reactFlow]);

  // Nothing to show
  if (allItems.length === 0 && !showCelebration) return null;

  return (
    <div className="absolute bottom-5 left-6 z-30 w-full max-w-[340px]">
      <div className="bg-[#0c0c0c] border border-white/[0.07] rounded-xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <h2 className="text-[13px] font-medium text-neutral-400 uppercase tracking-wide">
                Activity
              </h2>
              <div className="flex gap-1">
                {items.length > 0 && (
                  <span className="text-amber-400/80 text-[11px] font-mono bg-amber-500/10 border border-amber-500/15 px-1.5 py-0.5 rounded">
                    {items.length}
                  </span>
                )}
                {revealItems.length > 0 && (
                  <span className="text-purple-400/80 text-[11px] font-mono bg-purple-500/10 border border-purple-500/15 px-1.5 py-0.5 rounded">
                    {revealItems.length}
                  </span>
                )}
              </div>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleSound}
                className={`p-1 rounded transition-colors cursor-pointer ${soundEnabled ? 'text-amber-400 hover:text-amber-300' : 'text-neutral-600 hover:text-neutral-400'}`}
                title={soundEnabled ? 'Sound on' : 'Sound off'}
              >
                {soundEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-neutral-600 hover:text-white transition-colors cursor-pointer p-1"
              >
                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Summary bar */}
          {expanded && allItems.length > 0 && (
            <SummaryBar items={items} revealCount={revealItems.length} />
          )}
        </div>

        {/* Expandable list */}
        <div
          ref={contentRef}
          className="overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            maxHeight: expanded ? `${contentHeight || 600}px` : '0px',
            opacity: expanded ? 1 : 0,
          }}
        >
          {/* Celebration state */}
          {showCelebration && allItems.length === 0 && (
            <div className="border-t border-white/[0.06] flex flex-col items-center py-6 celebration-fade">
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center mb-3 animate-pulse">
                <CheckCircle2 className="text-emerald-400 w-5 h-5" />
              </div>
              <p className="text-white/80 text-sm font-medium">All nodes processed!</p>
              <p className="text-neutral-600 text-[11px] mt-1">Every scheduled action is complete</p>
            </div>
          )}

          {/* Unified rows — in-progress (amber) then ready (purple) */}
          {allItems.length > 0 && (
            <div className="border-t border-white/[0.06]">
              {allItems.map((item) => (
                <ProgressRow
                  key={item.nodeId}
                  nodeId={item.nodeId}
                  label={item.label}
                  amount={item.amount}
                  createdAt={item.createdAt}
                  executeAt={item.executeAt}
                  isReady={item.isReady}
                  onFocus={handleFocus}
                  onReveal={item.isReady ? onReveal : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InProgressPanel;
