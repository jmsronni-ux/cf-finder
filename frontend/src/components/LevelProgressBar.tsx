import React from 'react';

interface LevelProgressBarProps {
  withdrawn: number;
  total: number;
  className?: string;
}

const LevelProgressBar: React.FC<LevelProgressBarProps> = ({ 
  withdrawn, 
  total, 
  className = "" 
}) => {
  // Calculate the progress percentage based on withdrawn vs total networks
  const progressPercentage = total > 0 ? Math.min((withdrawn / total) * 100, 100) : 0;
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-full border border-purple-600 bg-purple-600/5 h-10 rounded-lg relative">
        <span 
          className="absolute left-0 mx-0.5 h-[90%] top-1/2 -translate-y-1/2 rounded-lg bg-gradient-to-r from-green-600/40 to-green-500"
          style={{ width: `calc(${progressPercentage}% - 4px)` }}
        />
        <p className="text-foreground text-sm font-medium absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bold">
          {withdrawn}/{total} Networks
        </p>
      </div>
    </div>
  );
};

export default LevelProgressBar;
