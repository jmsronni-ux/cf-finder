import React, { useEffect } from 'react';
import { X, CheckCircle, DollarSign, Wallet } from 'lucide-react';
import confetti from 'canvas-confetti';
import { NumberTicker } from './ui/number-ticker';
import { BorderBeam } from './ui/border-beam';

interface WithdrawSuccessPopupProps {
  isOpen: boolean;
  onClose: () => void;
  amount?: number;
  walletAddress?: string;
}

const WithdrawSuccessPopup: React.FC<WithdrawSuccessPopupProps> = ({ 
  isOpen, 
  onClose,
  amount,
  walletAddress
}) => {
  // Side Cannons confetti effect (matching NextLevelPopup)
  useEffect(() => {
    if (isOpen) {
      const end = Date.now() + 3 * 1000; // 3 seconds
      const colors = ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0"];

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
            WITHDRAWAL SUCCESSFUL
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
            Withdrawal Complete!
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Your funds have been successfully added to your balance
          </p>

          {/* Amount Card */}
          {amount !== undefined && (
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
                      Added to Your Balance
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-green-400">$</span>
                      <NumberTicker 
                        value={amount} 
                        className="text-3xl font-bold text-green-400"
                        decimalPlaces={2}
                        delay={0.3}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

         

          {/* Info Message
          <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-300 leading-relaxed">
              ✨ The commission has been deducted and your network rewards have been successfully added to your balance!
            </p>
          </div> */}
          
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 border border-green-500 text-white rounded-lg font-medium transition-all"
          >
            Awesome!
          </button>
        </div>
      </div>
    </div>
  );
};

export default WithdrawSuccessPopup;

