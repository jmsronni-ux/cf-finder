import React from 'react'
import { Lock } from 'lucide-react'
import { motion } from 'framer-motion'

interface LevelsProps {
  currentLevel: number;
  maxLevel?: number;
}

export default function Levels({ currentLevel, maxLevel = 5 }: LevelsProps) {
  const animationDuration = 0.4; // seconds per circle/line

  const renderLevel = (levelNumber: number, index: number) => {
    const isUnlocked = levelNumber <= currentLevel;
    const isCurrent = levelNumber === currentLevel;
    const isLocked = !isUnlocked;
    const delay = 0;

    if (isUnlocked) {
      // Current level has purple background, unlocked levels have default styling
      return (
        <motion.div
          key={levelNumber}
          className={`text-xs rounded px-4 py-2 cursor-pointer select-none ${
            isCurrent 
              ? 'bg-[#2F1746] border border-purple-500' 
              : 'bg-[#19191A] border border-gray-500'
          }`}
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: animationDuration, type: 'spring', stiffness: 260, damping: 20 }}
        >
          <p>Level {levelNumber}</p>
        </motion.div>
      );
    } else {
      // Locked level design (like current Level 2)
      return (
        <motion.div
          key={levelNumber}
          className="text-xs bg-[#19191A] border border-gray-500/50 text-white/10 rounded px-4 py-2 relative flex flex-col items-center justify-center"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay, duration: animationDuration, type: 'spring', stiffness: 260, damping: 20 }}
        >
          <p>Level {levelNumber}</p>
          <Lock className="text-white size-4 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
        </motion.div>
      );
    }
  };

  return (
    <div className="flex flex-row items-center p-6 absolute top-1 left-6 z-50">
      {Array.from({ length: maxLevel }, (_, index) => {
        const levelNumber = index + 1;
        const isLastLevel = levelNumber === maxLevel;
        return (
          <React.Fragment key={levelNumber}>
            {renderLevel(levelNumber, index)}
            {!isLastLevel && (
              <div
                className={`w-8 h-px mx-2 bg-gray-500/30 border-dotted`}
                style={{ opacity: 1, transform: 'none' }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  )
}

