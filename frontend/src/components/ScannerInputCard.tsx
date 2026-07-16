import React, { useState, useEffect } from 'react';
import { AlertTriangle, RotateCcw, ArrowLeft, Shield } from 'lucide-react';

interface Network {
  key: string;
  label: string;
  short: string;
  placeholder: string;
  color: string;
  icon: string;
}

interface ScannerInputCardProps {
  address: string;
  setAddress: (address: string) => void;
  selectedNetwork: Network;
  setSelectedNetwork: React.Dispatch<React.SetStateAction<Network>>;
  scanState: 'input' | 'scanning' | 'results';
  handleScan: () => void;
  handleReset: () => void;
  validationError: string | null;
  setValidationError: (err: string | null) => void;
  scanError: string | null;
  setScanError: (err: string | null) => void;
  networks: Network[];
  sweepGlow: boolean;
  clarityEvent: (eventName: string) => void;
  inputCardRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export const ScannerInputCard: React.FC<ScannerInputCardProps> = ({
  address,
  setAddress,
  selectedNetwork,
  setSelectedNetwork,
  scanState,
  handleScan,
  handleReset,
  validationError,
  setValidationError,
  scanError,
  setScanError,
  networks,
  sweepGlow,
  clarityEvent,
  inputCardRef,
  inputRef,
}) => {
  const [step, setStep] = useState<1 | 2>(1);

  // Automatically switch to step 2 if they are in 'scanning' or 'results'
  useEffect(() => {
    if (scanState !== 'input' && step === 1) {
      setStep(2);
    }
  }, [scanState, step]);

  const goToStep2 = (net: Network) => {
    setSelectedNetwork(net);
    setValidationError(null);
    setScanError(null);
    clarityEvent(`network_selected_${net.key}`);
    setStep(2);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const goToStep1 = () => {
    setStep(1);
    setAddress('');
    setValidationError(null);
    setScanError(null);
  };

  return (
    <div
      ref={inputCardRef}
      className={`rounded-2xl border p-5 sm:p-6 transition-all duration-500 ease-out bg-gradient-to-b from-[#1e1e1e] to-[#131313] ${
        sweepGlow
          ? 'border-emerald-500/30 shadow-[0_0_40px_-5px_rgba(16,185,129,0.15)]'
          : 'border-white/[0.14] shadow-[0_8px_32px_-6px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.04)]'
      }`}
    >
      {step === 1 ? (
        <div className="space-y-4">
          <div className="text-center sm:text-left mb-6">
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-3">
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Start Here</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">What kind of crypto was used?</h3>
            <p className="text-sm text-gray-400">Choose the network to begin. We support {networks.length} major blockchains to help you track down the details.</p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {networks.map((net) => (
              <button
                key={net.key}
                onClick={() => goToStep2(net)}
                disabled={scanState === 'scanning'}
                className="group relative flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.15] transition-all duration-200 disabled:opacity-40 overflow-hidden text-left"
              >
                <div 
                  className="absolute inset-0 opacity-[0.04] group-hover:opacity-[0.12] transition-opacity duration-300"
                  style={{ backgroundColor: net.color }}
                />
                <span
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-white/[0.04] border border-white/[0.05]"
                >
                  {net.icon ? (
                    <img src={net.icon} alt={net.label} className="w-4 h-4 object-contain opacity-90 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: net.color }} />
                  )}
                </span>
                <div className="flex flex-col">
                  <span className="text-[13px] sm:text-sm font-medium text-gray-200 group-hover:text-white transition-colors leading-tight">{net.label}</span>
                  <span className="text-[10px] text-gray-500 font-mono mt-0.5">{net.short}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col mb-4 sm:mb-6">
            <div className="flex items-center justify-center sm:justify-start w-full mb-4 gap-3">
              {scanState === 'input' && (
                <button
                  onClick={goToStep1}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors px-2.5 py-1.5 rounded bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Back</span>
                </button>
              )}
              
              <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: selectedNetwork.color }}
                />
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">
                  Scanning on {selectedNetwork.label} ({selectedNetwork.short})
                </span>
              </div>
            </div>
            
            <div className="text-center sm:text-left">
              <h3 className="text-xl font-semibold text-white mb-2">Paste the wallet address here</h3>
              <p className="text-sm text-gray-400">
                Just enter the public address you want to investigate. <em className="text-gray-300 not-italic">Your privacy is guaranteed, and we will never ask for your private keys.</em>
              </p>
            </div>
          </div>

          {/* Address input row */}
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            <div className="flex-1 relative group w-full">
              <input
                ref={inputRef}
                type="text"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setValidationError(null);
                  setScanError(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && scanState !== 'scanning' && handleScan()}
                placeholder={`Paste ${selectedNetwork.label} address…`}
                disabled={scanState === 'scanning'}
                autoComplete="off"
                spellCheck={false}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 sm:py-3 text-sm font-mono text-white placeholder:text-gray-600 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all duration-200 disabled:opacity-40"
              />
              {address.trim() && scanState === 'input' && (
                <button
                  onClick={() => {
                    setAddress('');
                    setValidationError(null);
                    setScanError(null);
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors p-1"
                  aria-label="Clear address"
                >
                  <span className="text-xs">✕</span>
                </button>
              )}
            </div>

            {/* Scan / Reset button */}
            <button
              onClick={scanState === 'scanning' ? undefined : scanState === 'results' ? handleReset : handleScan}
              disabled={scanState === 'scanning'}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 flex-shrink-0 w-full sm:w-auto
                ${
                  scanState === 'results'
                    ? 'bg-white/[0.06] border border-white/10 text-gray-300 hover:bg-white/[0.1] hover:text-white'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-[0.97] shadow-lg shadow-emerald-600/20'
                }`}
            >
              {scanState === 'scanning' ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Scanning
                </>
              ) : scanState === 'results' ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  New Scan
                </>
              ) : (
                'Track My Funds'
              )}
            </button>
          </div>

          {/* Validation / API error */}
          {(validationError || scanError) && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-500/[0.06] border border-red-500/10">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-400">{validationError || scanError}</p>
                {scanError && (
                  <button
                    onClick={handleScan}
                    className="text-xs text-red-400/70 hover:text-red-300 underline mt-1 transition-colors"
                  >
                    Try again
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
