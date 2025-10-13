import React from 'react';

interface LevelProgressBarProps {
  level: number;
  maxLevel?: number;
  className?: string;
}

const LevelProgressBar: React.FC<LevelProgressBarProps> = ({ 
  level, 
  maxLevel = 5, 
  className = "" 
}) => {
  // Calculate the progress percentage based on level
  const progressPercentage = Math.min((level / maxLevel) * 100, 100);
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-full border border-purple-600 bg-purple-600/5 h-10 rounded-lg relative">
        <span 
          className="absolute left-0 mx-0.5 h-[90%] top-1/2 -translate-y-1/2 rounded-lg bg-gradient-to-r from-green-600/40 to-green-500"
          style={{ width: `${progressPercentage}%` }}
        />
        <p className="text-foreground text-sm font-medium absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bold">
          Level {level}
        </p>
      </div>
    </div>
  );
};

export default LevelProgressBar;
