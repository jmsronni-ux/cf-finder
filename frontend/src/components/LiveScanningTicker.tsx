import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';

const FAKE_SCANS = [
  { address: '0x...e4a', network: 'Ethereum', outcome: 'High Risk', color: 'text-red-400', icon: ShieldAlert },
  { address: '1A...f92', network: 'Bitcoin', outcome: 'Funds Traced', color: 'text-emerald-400', icon: CheckCircle2 },
  { address: 'TL...p8z', network: 'Tron', outcome: 'Moderate Risk', color: 'text-yellow-400', icon: AlertTriangle },
  { address: '0x...8b1', network: 'USDT', outcome: 'Critical Threat', color: 'text-red-500', icon: ShieldAlert },
  { address: '7x...o2j', network: 'Solana', outcome: 'Clear', color: 'text-emerald-500', icon: CheckCircle2 },
  { address: '0x...c3d', network: 'BNB', outcome: 'Investigating', color: 'text-yellow-500', icon: Zap },
];

export const LiveScanningTicker: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % FAKE_SCANS.length);
        setIsVisible(true);
      }, 500); // 500ms fade out before changing
    }, 4500); // Change every 4.5 seconds

    return () => clearInterval(interval);
  }, []);

  const scan = FAKE_SCANS[currentIndex];
  const Icon = scan.icon;

  return (
    <div className={`w-full bg-[#111111] border-b border-white/5 text-center py-2.5 flex justify-center transition-opacity duration-500 relative z-[999999] ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="inline-flex items-center justify-center gap-2">
        <span className="flex h-2 w-2 relative mr-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[11px] sm:text-xs text-gray-400 whitespace-nowrap tracking-wide">
          Just scanned: <span className="font-mono text-gray-300">{scan.address}</span> ({scan.network})
        </span>
        <span className="text-gray-600 px-1">•</span>
        <div className={`flex items-center gap-1 font-medium text-[11px] sm:text-xs tracking-wide ${scan.color}`}>
          <Icon className="w-3.5 h-3.5" />
          {scan.outcome}
        </div>
      </div>
    </div>
  );
};
