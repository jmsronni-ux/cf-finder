import React, { useEffect } from 'react';
import { CheckCircle, X, TrendingUp, DollarSign, Wallet } from 'lucide-react';
import confetti from 'canvas-confetti';
import { NumberTicker } from './ui/number-ticker';
import { AnimatedGradientText } from './ui/animated-gradient-text';
import { BorderBeam } from './ui/border-beam';
import { useNavigate } from 'react-router-dom';

interface NextLevelPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlockNext?: () => void;
  currentLevel?: number;
  currentReward?: number;
  nextReward?: number;
  nextTierInfo?: {
    tier: number;
    name: string;
  } | null;
}

const NextLevelPopup: React.FC<NextLevelPopupProps> = ({ 
  isOpen, 
  onClose, 
  onUnlockNext, 
  currentLevel = 1,
  currentReward = 1000,
  nextReward = 5000,
  nextTierInfo = null
}) => {
  const navigate = useNavigate();
  
  const handleUnlockClick = () => {
    // Close the popup first
    onClose();
    
    // Navigate to profile with state to open withdraw popup
    navigate('/profile', { state: { openWithdrawPopup: true } });
  };
  // Side Cannons confetti effect
  useEffect(() => {
    if (isOpen) {
      const end = Date.now() + 3 * 1000; // 3 seconds
      const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];

      const frame = () => {
        if (Date.now() > end) return;

        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          startVelocity: 60,
          origin: { x: 0, y: 0.5 },
          colors: colors,
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          startVelocity: 60,
          origin: { x: 1, y: 0.5 },
          colors: colors,
        });

        requestAnimationFrame(frame);
      };

      frame();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-10 rounded-2xl" />
        
        {/* Success badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
            LEVEL COMPLETE
          </span>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="text-center relative z-10">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center border border-green-500/30">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <div className="absolute inset-0 animate-ping">
                <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-500 opacity-30" />
                </div>
              </div>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            Level {currentLevel} Complete!
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            You have successfully completed Level {currentLevel}
          </p>

          {/* Refunded Amount Card */}
          <div className="relative mb-4 bg-white/5 border border-green-500/30 rounded-lg p-6 overflow-hidden">
            <BorderBeam 
              size={80} 
              duration={8} 
              colorFrom="#10b981" 
              colorTo="#34d399"
              borderWidth={2}
            />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-green-500 font-medium mb-1">
                    Refunded to Your Account
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-green-400">$</span>
                    <NumberTicker 
                      value={currentReward} 
                      className="text-3xl font-bold text-green-400"
                      decimalPlaces={0}
                      delay={0.3}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Potential Funds Card */}
          {currentLevel < 5 && nextReward > 0 && (
            <div className="relative mb-6 bg-white/5 border border-purple-500/30 rounded-lg p-6 overflow-hidden">
              <BorderBeam 
                size={80} 
                duration={10} 
                colorFrom="#a855f7" 
                colorTo="#3b82f6"
                borderWidth={2}
              />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-purple-500 font-medium mb-1">
                      Potential Funds - Next Level
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">$</span>
                      <NumberTicker 
                        value={nextReward} 
                        className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400"
                        decimalPlaces={0}
                        delay={0.5}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-all"
            >
              Close
            </button>
            {currentLevel < 5 ? (
              <button
                onClick={handleUnlockClick}
                className="flex-1 flex gap-2 flex-row items-center justify-center px-6 py-3 bg-yellow-600/40 hover:bg-yellow-700 border border-yellow-600 text-white rounded-lg font-medium transition-all"
              >
                <Wallet className="w-4 h-4" />
                Withdraw
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-green-600/40 hover:bg-green-700 border border-green-600 text-white rounded-lg font-medium transition-all"
              >
                View Profile
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NextLevelPopup;
