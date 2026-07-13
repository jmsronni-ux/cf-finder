import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Lock, Clock, Info, Shield, Eye } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useLevelData } from '../hooks/useLevelData'

interface LevelsProps {
  currentLevel: number;
  maxLevel?: number;
  completedLevels?: Set<number>;
  editingTemplate?: string;
}

const SCAN_VALIDITY_HOURS = 24;

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Levels({
  currentLevel,
  maxLevel = 5,
  completedLevels = new Set(),
  editingTemplate,
}: LevelsProps) {
  const { user } = useAuth();
  const { levels } = useLevelData(editingTemplate || user?.levelTemplate || 'A');

  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(SCAN_VALIDITY_HOURS * 3600 * 1000);
  const scanStartRef = useRef<number>(Date.now());

  useEffect(() => {
    const key = user?._id ? `cfinder_scan_start_${user._id}` : null;
    if (key) {
      const stored = localStorage.getItem(key);
      if (stored) {
        scanStartRef.current = parseInt(stored, 10);
      } else {
        scanStartRef.current = Date.now();
        localStorage.setItem(key, String(scanStartRef.current));
      }
    }
    const id = setInterval(() => {
      setTimeRemaining(Math.max(0, SCAN_VALIDITY_HOURS * 3600 * 1000 - (Date.now() - scanStartRef.current)));
    }, 1000);

    // Listen for scan-start events to reset the timer
    const handleScanStarted = () => {
      if (key) {
        scanStartRef.current = Date.now();
        localStorage.setItem(key, String(scanStartRef.current));
        setTimeRemaining(SCAN_VALIDITY_HOURS * 3600 * 1000);
      }
    };
    window.addEventListener('cfinder:scan-started', handleScanStarted);

    return () => {
      clearInterval(id);
      window.removeEventListener('cfinder:scan-started', handleScanStarted);
    };
  }, [user?._id]);

  const levelCounts = useMemo(() => {
    const out: Record<number, { total: number; claimed: number }> = {};
    for (let lvl = 1; lvl <= maxLevel; lvl++) {
      const ld = levels.find(l => l.level === lvl);
      if (!ld) { out[lvl] = { total: 0, claimed: 0 }; continue; }
      const fp = ld.nodes.filter(
        (n: any) => n.type === 'fingerprintNode' && n.data?.transaction && (n.data?.level ?? 1) === lvl
      );
      out[lvl] = {
        total: fp.length,
        claimed: fp.filter((n: any) => {
          const s = user?.nodeProgress?.[n.id];
          return s === 'success' || s === 'partial success' || s === 'fail';
        }).length,
      };
    }
    return out;
  }, [levels, user?.nodeProgress, maxLevel]);

  const getStatus = (level: number): 'completed' | 'current' | 'locked' => {
    if (completedLevels.has(level) && level < currentLevel) return 'completed';
    if (level === currentLevel) return 'current';
    if (level < currentLevel) return 'completed';
    return 'locked';
  };

  // Check if user has claimed anything on any unlocked level
  const hasClaimedAny = useMemo(() => {
    for (let lvl = 1; lvl <= currentLevel; lvl++) {
      if ((levelCounts[lvl]?.claimed ?? 0) > 0) return true;
    }
    return false;
  }, [levelCounts, currentLevel]);

  const hoursLeft = timeRemaining / 3_600_000;
  const isExpired = timeRemaining <= 0;
  const timerUrgent = hoursLeft <= 4;
  const timerColor = isExpired || timerUrgent ? 'text-red-400' : hoursLeft <= 12 ? 'text-amber-400' : 'text-neutral-500';
  const timerDot   = isExpired || timerUrgent ? 'bg-red-500'  : hoursLeft <= 12 ? 'bg-amber-500'  : 'bg-neutral-600';

  return (
    <div
      className="absolute top-4 left-4 sm:top-5 sm:left-6 z-50 max-w-[calc(100dvw-32px)] sm:max-w-none"
      data-onboarding-step="network-levels"
    >
      <div className="bg-[#0c0c0c] border border-white/[0.07] shadow-2xl overflow-visible flex items-stretch h-[46px] rounded-xl transition-colors hover:border-white/[0.12]">

        {/* Level sections */}
        {Array.from({ length: maxLevel }, (_, i) => i + 1).map((level) => {
          const status = getStatus(level);
          const { total, claimed } = levelCounts[level] || { total: 0, claimed: 0 };
          const isLocked = status === 'locked';
          const isCurrent = status === 'current';

          const dotColor = isLocked ? 'bg-neutral-800' : isCurrent ? 'bg-purple-500' : 'bg-emerald-500/70';

          return (
            <div
              key={level}
              className={`flex-col justify-center px-3 sm:px-3.5 border-r border-white/[0.05] transition-colors ${
                isCurrent ? 'flex bg-purple-500/[0.04]' : isLocked ? 'hidden sm:flex' : 'hidden sm:flex bg-white/[0.02]'
              }`}
            >
              {/* Label */}
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className={`w-1 h-1 rounded-full ${dotColor}`} />
                <span className={`text-[9px] font-mono uppercase tracking-widest leading-none ${
                  isLocked ? 'text-neutral-700' : 'text-neutral-500'
                }`}>
                  <span className="hidden sm:inline">Level </span>
                  <span className="sm:hidden">L</span>{level}
                </span>
              </div>

              {/* Value */}
              <div className="mt-0.5">
                {isLocked ? (
                  <div className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-neutral-800" />
                    <span className="hidden sm:inline text-[10px] text-neutral-800 leading-none">Locked</span>
                  </div>
                ) : total === 0 ? (
                  <span className="text-neutral-700 text-sm font-medium leading-none">—</span>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className={`text-sm font-medium leading-none tabular-nums ${
                      isCurrent ? 'text-white' : 'text-neutral-300'
                    }`}>
                      {claimed}
                    </span>
                    <span className="text-neutral-600 text-[10px] leading-none">
                      of {total}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Timer + info icon */}
        <div className={`relative flex flex-col justify-center px-2 sm:px-3.5 rounded-r-xl ${timerColor} ${
          isExpired ? 'bg-red-500/[0.08]' : timerUrgent ? 'bg-red-500/[0.06]' : hoursLeft <= 12 ? 'bg-amber-500/[0.04]' : 'bg-white/[0.01]'
        }`}>
          {/* Label row with info icon */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className={`w-1 h-1 rounded-full animate-pulse ${timerDot}`} />
            <span className={`text-[9px] font-mono uppercase tracking-widest leading-none ${
              isExpired ? 'text-red-400' : timerUrgent ? 'text-red-400/80' : hoursLeft <= 12 ? 'text-amber-400/60' : 'text-neutral-500'
            }`}>
              <span className="hidden sm:inline">{isExpired ? 'Expired' : 'Scan valid'}</span>
              <span className="sm:hidden">{isExpired ? 'Exp' : 'Scan'}</span>
            </span>
            {/* Info icon */}
            <div
              className="relative cursor-help"
              onMouseEnter={() => setShowInfoTooltip(true)}
              onMouseLeave={() => setShowInfoTooltip(false)}
            >
              <Info className="w-3 h-3 text-neutral-600 hover:text-neutral-400 transition-colors" />
            </div>
          </div>

          {/* Timer value */}
          <div className="flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            <span className="text-sm font-medium leading-none tracking-tight font-mono tabular-nums">
              {formatCountdown(timeRemaining)}
            </span>
          </div>

          {/* Tooltip — positioned below the entire pill, right-aligned */}
          {showInfoTooltip && (
            <div
              className="absolute top-[calc(100%+10px)] right-0 z-[200] max-w-[calc(100dvw-32px)]"
              style={{ width: '268px' }}
              onMouseEnter={() => setShowInfoTooltip(true)}
              onMouseLeave={() => setShowInfoTooltip(false)}
            >
              <div className="bg-[#1a1a1a] border border-white/[0.10] rounded-lg p-3.5 shadow-xl">
                {/* Arrow */}
                <div className="absolute -top-[5px] right-6 w-2.5 h-2.5 bg-[#1a1a1a] border-l border-t border-white/[0.10] rotate-45" />

                {/* Scan validity */}
                <div className="flex items-start gap-2.5 mb-2.5">
                  <Shield className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] text-white/90 font-medium leading-tight mb-1">Time-Sensitive Results</p>
                    <p className="text-[10px] text-neutral-400 leading-relaxed">
                      Scan results are valid for <span className="text-amber-400 font-medium">24 hours</span>.
                      After this window closes, unclaimed nodes may become unrecoverable as on-chain conditions change.
                    </p>
                  </div>
                </div>

                {/* Claimed funds warning */}
                {hasClaimedAny && (
                  <>
                    <div className="h-px bg-white/[0.06] my-2.5" />
                    <div className="flex items-start gap-2.5">
                      <Eye className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] text-red-400/90 font-medium leading-tight mb-1">Increased Exposure Risk</p>
                        <p className="text-[10px] text-neutral-400 leading-relaxed">
                          You've already recovered funds. Be aware that third parties may have detected
                          this activity and could take steps to move or obscure the remaining assets.{' '}
                          <span className="text-red-400/80 font-medium">
                            Claim remaining nodes as soon as possible.
                          </span>
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
