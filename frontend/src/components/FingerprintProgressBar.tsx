import React from 'react';
import { cn } from "@/lib/utils";

interface FingerprintProgressBarProps {
  completed: number;
  total: number;
  className?: string;
}

export const FingerprintProgressBar: React.FC<FingerprintProgressBarProps> = ({
  completed,
  total,
  className
}) => {
  const percentage = total > 0 ? Math.min((completed / total) * 100, 100) : 0;

  return (
    <div 
      className={cn(
        "flex z-[100] flex-col items-center justify-center rounded-xl px-5 h-9 transition-all duration-200 border shadow-2xl bg-[#0c0c0c] border-amber-500/20 absolute top-5 right-[3.75rem] w-fit min-w-[12rem] mr-4 overflow-hidden",
        className
      )}
    >
      {/* Border Progress Line at the bottom */}
      <div 
        className="absolute bottom-0 left-0 h-[2px] bg-amber-500/40 transition-all duration-700 ease-out"
        style={{ width: `${percentage}%` }}
      />

      <div className="relative z-10 w-full flex items-center justify-between gap-4">
        <span className="text-amber-400/80 text-[10px] uppercase tracking-wider font-bold">
          Nodes Completed
        </span>
        <span className="text-amber-400/90 text-xs font-mono font-bold">
          {completed}/{total}
        </span>
      </div>

      {/* Pulsing indicator */}
      <div className="absolute top-1 right-1 opacity-50">
        <div className="relative flex-shrink-0 scale-[0.6]">
          <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
          <div className="absolute inset-0 w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping opacity-40"></div>
        </div>
      </div>
    </div>
  );
};
