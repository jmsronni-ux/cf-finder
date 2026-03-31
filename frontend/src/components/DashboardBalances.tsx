import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeftRight } from 'lucide-react';
import { TransferPopup } from './TransferPopup';

export default function DashboardBalances() {
  const { user, refreshUser } = useAuth();
  const [showTransfer, setShowTransfer] = useState(false);

  if (!user) return null;

  return (
    <>
      <div className="absolute top-5 left-[260px] z-50 flex items-center">
        <div className="bg-[#0c0c0c] border border-white/[0.07] shadow-2xl overflow-hidden flex items-stretch h-[46px] rounded-xl transition-colors hover:border-white/[0.12]">
          
          {/* Available */}
          <div className="flex flex-col justify-center px-4 bg-white/[0.02] border-r border-white/[0.05]">
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="w-1 h-1 bg-emerald-500 rounded-full" />
              <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest leading-none">Available</span>
            </div>
            <div className="flex items-baseline gap-0.5 mt-0.5">
              <span className="text-neutral-500 text-[10px] font-mono">$</span>
              <span className="text-white text-sm font-medium leading-none tracking-tight">{(user.availableBalance || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
          </div>

          {/* Onchain */}
          <div className="flex flex-col justify-center px-4 bg-white/[0.01]">
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="w-1 h-1 bg-purple-500 rounded-full" />
              <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest leading-none">Onchain</span>
            </div>
            <div className="flex items-baseline gap-0.5 mt-0.5">
              <span className="text-neutral-500 text-[10px] font-mono">$</span>
              <span className="text-white text-sm font-medium leading-none tracking-tight">{(user.balance || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
          </div>

          {/* Transfer Action */}
          <button 
            onClick={() => setShowTransfer(true)}
            className="flex items-center justify-center px-3.5 border-l border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.06] transition-colors group text-neutral-400 hover:text-white"
            title="Transfer Balance"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 transform group-hover:scale-110 transition-transform" />
          </button>

        </div>
      </div>

      <TransferPopup 
        isOpen={showTransfer} 
        onClose={() => setShowTransfer(false)} 
        onSuccess={() => {
          if (refreshUser) refreshUser();
        }} 
      />
    </>
  );
}
