import React, { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

const PROCESSING_STEPS = [
  { label: 'Scanning Blockchain' },
  { label: 'Tracing Fund Path' },
  { label: 'Initiating Recovery' },
];

// Compute the visual center position (%) of each step circle in the flex layout.
// With N equal-width children in a row, the i-th circle center sits at (i + 0.5) / N * 100%.
const STEP_POSITIONS = PROCESSING_STEPS.map((_, i) =>
  ((i + 0.5) / PROCESSING_STEPS.length) * 100
);
// → [16.66, 50, 83.33]

interface ProcessingStepsProps {
  executeAt?: string;
  createdAt?: string;
}

const ProcessingSteps: React.FC<ProcessingStepsProps> = ({ executeAt, createdAt }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (executeAt && createdAt) {
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
    } else {
      let p = 0;
      const interval = setInterval(() => {
        p += 0.3 + Math.random() * 0.5;
        if (p > 95) p = 95;
        setProgress(p);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [executeAt, createdAt]);

  // A step is "passed" (checkmark) when the progress dot has visually moved beyond its circle.
  // A step is "active" (amber pulse) when the previous step is passed but this one isn't yet.
  const getStepState = (i: number) => {
    const isPassed = progress >= STEP_POSITIONS[i];
    const isActive = !isPassed && (i === 0 || progress >= STEP_POSITIONS[i - 1]);
    return { isPassed, isActive };
  };

  const allPassed = progress >= STEP_POSITIONS[STEP_POSITIONS.length - 1];

  return (
    <div className="mt-3 relative">
      {/* Connecting line background */}
      <div className="absolute top-[9px] left-[9px] right-[9px] h-[2px] bg-white/[0.06] rounded-full" />
      {/* Connecting line fill — green for passed, amber for active */}
      <div
        className="absolute top-[9px] left-[9px] h-[2px] rounded-full transition-all duration-1000 ease-linear"
        style={{
          width: `calc(${Math.min(progress, 100)}% - 18px)`,
          background: allPassed
            ? 'rgb(52, 211, 153)'
            : `linear-gradient(to right, rgb(52, 211, 153) ${Math.max(0, progress - 15)}%, rgb(245, 158, 11) 100%)`,
        }}
      />
      {/* Traveling dot */}
      <div
        className={`absolute top-[5px] w-[10px] h-[10px] rounded-full transition-all duration-1000 ease-linear z-10 ${allPassed
            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
            : 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
          }`}
        style={{ left: `calc(${Math.min(progress, 100)}% - 14px)` }}
      />
      {/* Step circles + labels */}
      <div className="flex justify-between relative z-20">
        {PROCESSING_STEPS.map((step, i) => {
          const { isPassed, isActive } = getStepState(i);
          return (
            <div key={i} className="flex flex-col items-center" style={{ width: '33.33%' }}>
              <div
                className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all duration-500 ${isPassed
                    ? 'border-emerald-400 bg-[#0a1a14]'
                    : isActive
                      ? 'border-amber-400 bg-amber-400/20'
                      : 'border-white/10 bg-[#0c0c0c]'
                  }`}
              >
                {isPassed ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : isActive ? (
                  <div className="w-[6px] h-[6px] rounded-full bg-amber-400 animate-pulse" />
                ) : null}
              </div>
              <span className={`text-[9px] mt-1.5 text-center leading-tight transition-colors duration-500 ${isPassed ? 'text-emerald-400 font-medium' : isActive ? 'text-amber-400 font-medium' : 'text-neutral-600'
                }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProcessingSteps;
