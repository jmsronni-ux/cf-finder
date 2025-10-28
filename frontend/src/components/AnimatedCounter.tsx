import { ArrowUp } from 'lucide-react';
import React, { useEffect, useState, useRef, useMemo } from 'react';

type CounterType = 'levelReward' | 'levelTotal' | 'nextLevelReward';

interface User {
  [key: string]: any;
}

interface AnimatedCounterProps {
  type: CounterType;
  progress: number;
  level: number;
  user?: User | null;
  transactions?: any[];
  duration?: number;
  currency?: string;
  className?: string;
  levelTotalUSDT?: number;
  shouldAnimate?: boolean; // New prop to control animation
}

interface DigitProps {
  digit: number;
  isRolling: boolean;
}

const RollingDigit: React.FC<DigitProps> = ({ digit, isRolling }) => {
  return (
    <div className="relative h-[1.2em] w-[0.6em] overflow-hidden inline-block">
      <div 
        className={`flex flex-col transition-transform ${isRolling ? 'duration-500' : 'duration-0'} ease-out`}
        style={{
          transform: `translateY(-${digit * 10}%)`,
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <div key={num} className="h-[1.2em] flex items-center justify-center">
            {num}
          </div>
        ))}
      </div>
    </div>
  );
};

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ 
  type,
  progress,
  level,
  user = null,
  transactions = [],
  duration = 800, 
  currency = "USD",
  className = "",
  levelTotalUSDT,
  shouldAnimate = false
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [showArrow, setShowArrow] = useState(false);
  const prevTargetRef = useRef(0);
  const stepIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Removed random transaction multiplier to ensure accurate totals

  // Get the full reward for current level from database
  const fullLevelReward = useMemo(() => {
    if (!user) return 0;
    const rewardKey = `lvl${level}reward` as keyof typeof user;
    const reward = user[rewardKey];
    return typeof reward === 'number' ? reward : 0;
  }, [user, level]);

  // Get the full next level reward
  const fullNextLevelReward = useMemo(() => {
    if (!user || level >= 5) return 0; // No next level if at max
    const nextLevel = level + 1;
    const rewardKey = `lvl${nextLevel}reward` as keyof typeof user;
    const reward = user[rewardKey];
    const baseReward = typeof reward === 'number' ? reward : 0;
    return baseReward;
  }, [user, level]);

  // Calculate the target value based on type
  const calculateTarget = (): number => {
    if (type === 'levelReward') {
      const reward = (fullLevelReward * progress) / 100;
      return reward;
    } else if (type === 'levelTotal') {
      if (typeof levelTotalUSDT === 'number') {
        return levelTotalUSDT;
      }
      const baseAmount = transactions
        .filter((tx: any) => tx.status === 'Success')
        .reduce((sum: number, tx: any) => sum + (Number(tx.amount) || 0), 0);
      return baseAmount;
    } else if (type === 'nextLevelReward') {
      return fullNextLevelReward;
    }
    return 0;
  };

  const getLabel = (): string => {
    if (type === 'levelReward') {
      return `Level ${level} Reward`;
    } else if (type === 'levelTotal') {
      return `Level ${level} Total`;
    } else if (type === 'nextLevelReward') {
      return `Estimated Level ${level + 1} Reward`;
    }
    return '';
  };

  useEffect(() => {
    const targetValue = Math.floor(calculateTarget());
    const startValue = displayValue;

    // If progress is 100%, immediately show final value without animation
    if (progress >= 100) {
      setDisplayValue(targetValue);
      prevTargetRef.current = targetValue;
      setIsRolling(false);
      setShowArrow(false);
      
      // Clear any existing interval
      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current);
      }
      return;
    }

    // Only animate if shouldAnimate is true AND target has changed significantly
    if (!shouldAnimate || Math.abs(targetValue - prevTargetRef.current) < 1) {
      return;
    }

    // Show arrow if value is increasing
    if (targetValue > startValue) {
      setShowArrow(true);
      // Calculate dynamic duration based on progress
      const dynamicDuration = Math.max(duration, progress * 10); // Scale with progress
      setTimeout(() => setShowArrow(false), dynamicDuration + 500);
    }

    // Clear any existing interval
    if (stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current);
    }

    setIsRolling(true);

    const stepDuration = 500; // Duration of each rolling step in ms
    // Dynamic duration based on progress (longer animation as progress increases)
    const dynamicDuration = Math.max(duration, progress * 10);
    const totalSteps = Math.ceil(dynamicDuration / stepDuration);
    const stepSize = Math.ceil((targetValue - startValue) / totalSteps);
    let currentStep = 0;
    let currentValue = startValue;

    stepIntervalRef.current = setInterval(() => {
      currentStep++;
      currentValue += stepSize;
      
      // Ensure we don't overshoot the target
      const newValue = Math.min(currentValue, targetValue);
      
      setDisplayValue(newValue);
      
      if (newValue >= targetValue) {
        setDisplayValue(targetValue);
        prevTargetRef.current = targetValue;
        setIsRolling(false);
        if (stepIntervalRef.current) {
          clearInterval(stepIntervalRef.current);
        }
      }
    }, stepDuration);

    return () => {
      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current);
      }
      setIsRolling(false);
    };
  }, [progress, fullLevelReward, fullNextLevelReward, transactions, levelTotalUSDT, type, level, duration, displayValue, shouldAnimate]);

  // Convert number to array of digits without leading zeros
  const getDigits = (num: number) => {
    if (num === 0) return [0];
    const str = num.toString();
    return str.split('').map(d => parseInt(d));
  };

  const digits = getDigits(displayValue);
  const label = getLabel();

  return (
    <div className={`${className} flex flex-col items-center justify-center relative w-full border border-border rounded-lg space-y-2 ${showArrow && 'bg-green-500/10 border-green-500'}`}>
      <p className="absolute top-4 left-4 text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <div className="flex items-end text-4xl font-bold text-white">
        <div className="tabular-nums flex">
          {digits.map((digit, index) => (
            <RollingDigit key={index} digit={digit} isRolling={isRolling} />
          ))}
        </div>
        <span className="absolute bottom-4 right-4 text-sm ml-2 text-white">{currency}</span>
        {showArrow && (
          <div className="ml-2 animate-bounce absolute top-5 right-5">
            <ArrowUp className="w-6 h-6 text-green-500" />
          </div>
        )}
      </div>
    </div>
  );
};

export default AnimatedCounter;

