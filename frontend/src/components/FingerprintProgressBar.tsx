import React from 'react';
import { cn } from "@/lib/utils";

interface FingerprintProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  completed: number;
  total: number;
  className?: string;
}

export const FingerprintProgressBar: React.FC<FingerprintProgressBarProps> = ({
  completed,
  total,
  className,
  ...props
}) => {
  const percentage = total > 0 ? Math.min((completed / total) * 100, 100) : 0;

  return (
    <div 
      className={cn(
        "flex z-[100] flex-col items-center justify-center rounded-xl px-0 sm:px-5 h-[46px] sm:h-9 transition-all duration-200 border shadow-2xl bg-[#0c0c0c] border-amber-500/20 w-[46px] sm:w-fit min-w-0 sm:min-w-[12rem] overflow-hidden",
        className
      )}
      {...props}
    >
      {/* Border Progress Line at the bottom */}
      <div 
        className="absolute bottom-0 left-0 h-[2px] bg-amber-500/40 transition-all duration-700 ease-out"
        style={{ width: `${percentage}%` }}
      />

      <div className="relative z-10 w-full flex items-center justify-center sm:justify-between h-full gap-0 sm:gap-4">
        <span className="hidden sm:inline text-amber-400/80 text-[10px] uppercase tracking-wider font-bold whitespace-nowrap">
          Nodes Completed
        </span>
        <span className="text-amber-400/90 text-[10px] sm:text-xs font-mono font-bold tracking-tighter">
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
