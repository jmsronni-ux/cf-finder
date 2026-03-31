import React, { useState, useEffect, useRef } from 'react'
import { Lock, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface LevelsProps {
  currentLevel: number;
  maxLevel?: number;
  completedLevels?: Set<number>;
}

export default function Levels({ currentLevel, maxLevel = 5, completedLevels = new Set() }: LevelsProps) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [expanded, currentLevel, maxLevel]);

  const levels = Array.from({ length: maxLevel }, (_, i) => i + 1);

  const getStatus = (level: number): 'completed' | 'current' | 'locked' => {
    if (completedLevels.has(level) && level < currentLevel) return 'completed';
    if (level === currentLevel) return 'current';
    if (level < currentLevel) return 'completed';
    return 'locked';
  };

  const completedCount = levels.filter(l => getStatus(l) === 'completed').length;

  return (
    <div className="absolute top-5 left-6 z-50 w-full max-w-[220px]">
      <div className="bg-[#0c0c0c] border border-white/[0.07] rounded-xl shadow-2xl overflow-hidden">
        {/* Collapsed header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 h-[46px] flex items-center justify-between cursor-pointer group transition-colors hover:bg-white/[0.02]"
        >
          <div className="flex items-center gap-2.5">
            <div className="relative flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-purple-400" />
              {getStatus(currentLevel) === 'current' && (
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-purple-400 animate-ping opacity-30" />
              )}
            </div>
            <span className="text-neutral-300 text-xs font-medium">
              Level {currentLevel}
            </span>
            <span className="text-neutral-600 text-[11px] font-mono">
              / {maxLevel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Segmented progress bar */}
            <div className="flex gap-[2px]">
              {levels.map(level => {
                const status = getStatus(level);
                return (
                  <div
                    key={level}
                    className={`w-3 h-1 rounded-[1px] transition-colors duration-300 ${
                      status === 'completed'
                        ? 'bg-emerald-500/70'
                        : status === 'current'
                          ? 'bg-purple-500/80'
                          : 'bg-white/[0.08]'
                    }`}
                  />
                );
              })}
            </div>
            <div className="text-neutral-600 group-hover:text-neutral-400 transition-colors">
              {expanded
                ? <ChevronUp className="w-3.5 h-3.5" />
                : <ChevronDown className="w-3.5 h-3.5" />
              }
            </div>
          </div>
        </button>

        {/* Expandable level list */}
        <div
          className="overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            maxHeight: expanded ? `${contentHeight || 300}px` : '0px',
            opacity: expanded ? 1 : 0,
          }}
        >
          <div ref={contentRef}>
            <div className="border-t border-white/[0.06]">
              {levels.map((level) => {
                const status = getStatus(level);
                return (
                  <div
                    key={level}
                    className={`px-4 py-2.5 flex items-center justify-between border-b border-white/[0.04] last:border-b-0 transition-colors ${
                      status === 'current'
                        ? 'bg-purple-500/[0.06]'
                        : status === 'completed'
                          ? 'hover:bg-white/[0.02]'
                          : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Status indicator */}
                      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                        {status === 'completed' ? (
                          <div className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-emerald-400" />
                          </div>
                        ) : status === 'current' ? (
                          <div className="relative">
                            <div className="w-4 h-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                            </div>
                          </div>
                        ) : (
                          <Lock className="w-3 h-3 text-neutral-700" />
                        )}
                      </div>

                      <span className={`text-xs ${
                        status === 'current'
                          ? 'text-purple-300 font-medium'
                          : status === 'completed'
                            ? 'text-neutral-400'
                            : 'text-neutral-700'
                      }`}>
                        Level {level}
                      </span>
                    </div>

                    {/* Right side label */}
                    <span className={`text-[10px] font-mono uppercase tracking-wider ${
                      status === 'current'
                        ? 'text-purple-500/60'
                        : status === 'completed'
                          ? 'text-emerald-500/40'
                          : 'text-neutral-800'
                    }`}>
                      {status === 'current' ? 'Active' : status === 'completed' ? 'Done' : 'Locked'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Footer summary */}
            <div className="px-4 py-2.5 border-t border-white/[0.06]">
              <p className="text-neutral-600 text-[11px]">
                {completedCount} of {maxLevel} completed
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
