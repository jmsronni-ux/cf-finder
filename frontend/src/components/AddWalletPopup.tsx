import React, { useState } from 'react';
import { Wallet, AlertCircle, Check, Key, ArrowLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { validateWalletAddress } from '../utils/walletValidation';
import { apiFetch } from '../utils/api';

interface AddWalletPopupProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess: () => void;
  isPopup?: boolean;
}

type InputMode = 'wallet' | 'access_code';
type NetworkKey = 'btc' | 'eth' | 'usdtErc20' | 'sol' | 'bnb' | 'tron';

interface NetworkConfig {
  key: NetworkKey;
  label: string;
  shortLabel: string;
  placeholder: string;
  color: string;
  logo: string;
}

const NETWORKS: NetworkConfig[] = [
  { key: 'btc', label: 'Bitcoin', shortLabel: 'BTC', placeholder: 'Enter BTC address...', color: '#F7931A', logo: '/assets/crypto-logos/bitcoin-btc-logo.svg' },
  { key: 'eth', label: 'Ethereum', shortLabel: 'ETH', placeholder: 'Enter ETH address (0x...)', color: '#627EEA', logo: '/assets/crypto-logos/ethereum-eth-logo.svg' },
  { key: 'usdtErc20', label: 'Tether', shortLabel: 'USDT', placeholder: 'Enter USDT ERC-20 address (0x...)', color: '#26A17B', logo: '/assets/crypto-logos/tether-usdt-logo.svg' },
  { key: 'sol', label: 'Solana', shortLabel: 'SOL', placeholder: 'Enter SOL address...', color: '#9945FF', logo: '/assets/crypto-logos/solana-sol-logo.svg' },
  { key: 'bnb', label: 'BNB Chain', shortLabel: 'BNB', placeholder: 'Enter BNB address (0x...)', color: '#F0B90B', logo: '/assets/crypto-logos/bnb-bnb-logo.svg' },
  { key: 'tron', label: 'Tron', shortLabel: 'TRX', placeholder: 'Enter TRX address (T...)', color: '#FF0013', logo: '/assets/crypto-logos/tron-trx-logo.svg' },
];

const AddWalletPopup: React.FC<AddWalletPopupProps> = ({
  isOpen = true,
  onClose,
  onSuccess,
  isPopup = true
}) => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [inputMode, setInputMode] = useState<InputMode>('wallet');
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedNetworks, setSelectedNetworks] = useState<Set<NetworkKey>>(new Set());
  const [wallets, setWallets] = useState<Record<NetworkKey, string>>(
    () => NETWORKS.reduce((acc, net) => ({ ...acc, [net.key]: '' }), {} as Record<NetworkKey, string>)
  );
  const [accessCode, setAccessCode] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string>('');

  if (isPopup && !isOpen) return null;

  const selectedNets = NETWORKS.filter(net => selectedNetworks.has(net.key));
  const filledCount = selectedNets.filter(net => wallets[net.key]?.trim()).length;
  const hasAtLeastOneWallet = filledCount > 0;

  const toggleNetwork = (key: NetworkKey) => {
    setSelectedNetworks(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleWalletChange = (key: NetworkKey, value: string) => {
    setWallets(prev => ({ ...prev, [key]: value }));
    if (validationErrors[key]) {
      setValidationErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
    }
    if (value.trim()) {
      const v = validateWalletAddress(value, key);
      if (!v.isValid) setValidationErrors(prev => ({ ...prev, [key]: v.error || 'Invalid address' }));
    }
  };

  const handleAccessCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAccessCode(e.target.value);
    if (validationError) setValidationError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (inputMode === 'wallet') {
      if (!hasAtLeastOneWallet) { toast.error('Please enter at least one wallet address'); return; }

      const errors: Record<string, string> = {};
      for (const net of selectedNets) {
        const addr = wallets[net.key]?.trim();
        if (addr) {
          const v = validateWalletAddress(addr, net.key);
          if (!v.isValid) errors[net.key] = v.error || `Invalid ${net.shortLabel} address`;
        }
      }
      if (Object.keys(errors).length > 0) { setValidationErrors(errors); toast.error('Please fix invalid addresses'); return; }

      setIsSubmitting(true);
      try {
        const payload: Record<string, string> = {};
        for (const net of selectedNets) { const a = wallets[net.key]?.trim(); if (a) payload[net.key] = a; }

        const response = await apiFetch('/user/me/wallets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ wallets: payload }),
        });
        const data = await response.json();
        if (response.ok && data.success) { toast.success('Wallets saved successfully!'); onSuccess(); onClose?.(); }
        else toast.error(data.message || 'Failed to save wallets');
      } catch { toast.error('An error occurred. Please try again.'); }
      finally { setIsSubmitting(false); }
    } else {
      if (!accessCode.trim()) {
        setValidationError('Please enter your forensic access code');
        toast.error('Please enter your forensic access code');
        return;
      }

      setIsSubmitting(true);
      try {
        const response = await apiFetch('/wallet-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ submissionType: 'access_code', forensicAccessCode: accessCode.trim(), walletType: 'btc' }),
        });
        const data = await response.json();
        if (response.ok && data.success) {
          toast.success('Access code submitted for verification!');
          setAccessCode('');
          onSuccess();
          onClose?.();
        } else {
          toast.error(data.message || 'Failed to submit access code.');
        }
      } catch { toast.error('An error occurred. Please try again.'); }
      finally { setIsSubmitting(false); }
    }
  };

  // ── Shared inner content ──
  const innerContent = () => {
    // ── Access Code ──
    if (inputMode === 'access_code') {
      return (
        <form onSubmit={handleSubmit} className="space-y-4">
          <button
            type="button"
            onClick={() => { setInputMode('wallet'); setStep(1); setValidationError(''); }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Back to wallets
          </button>

          <div className={`rounded-lg px-3 py-2.5 text-xs flex items-start gap-2 ${
            validationError ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-purple-500/8 border border-purple-500/15 text-purple-400'
          }`}>
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{validationError || 'Your access code will be verified by an admin before you can proceed.'}</span>
          </div>

          <div className="relative">
            <Key className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${validationError ? 'text-red-400' : 'text-gray-500'}`} />
            <input
              type="text"
              value={accessCode}
              onChange={handleAccessCodeChange}
              placeholder="Enter your access code"
              disabled={isSubmitting}
              className={`w-full bg-white/5 text-white text-sm pl-9 pr-4 py-2.5 rounded-lg border outline-none transition-all ${
                validationError ? 'border-red-500/40 focus:border-red-500' : 'border-white/10 focus:border-purple-500/50'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !accessCode.trim()}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-purple-600/40 hover:bg-purple-600/60 border border-purple-500/40"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Access Code'}
          </button>
        </form>
      );
    }

    // ── Step 1: Select networks ──
    if (step === 1) {
      return (
        <div className="space-y-4">

          <div className="grid grid-cols-3 gap-2">
            {NETWORKS.map(net => {
              const on = selectedNetworks.has(net.key);
              return (
                <button
                  key={net.key}
                  type="button"
                  onClick={() => toggleNetwork(net.key)}
                  className="relative flex flex-col items-center gap-1.5 rounded-lg border py-3 px-2 transition-all duration-150"
                  style={{
                    borderColor: on ? `${net.color}50` : 'rgba(255,255,255,0.07)',
                    background: on ? `${net.color}0A` : 'transparent',
                  }}
                >
                  {/* Checkmark */}
                  <div
                    className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: on ? `${net.color}25` : 'transparent',
                      border: `1.5px solid ${on ? net.color : 'rgba(255,255,255,0.12)'}`,
                    }}
                  >
                    {on && <Check className="w-2 h-2" style={{ color: net.color }} />}
                  </div>

                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center"
                    style={{ background: `${net.color}15` }}
                  >
                    <img src={net.logo} alt={net.shortLabel} className="w-5 h-5" />
                  </div>
                  <span className={`text-[11px] font-medium leading-tight ${on ? 'text-white' : 'text-gray-400'}`}>
                    {net.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={selectedNetworks.size === 0}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: selectedNetworks.size > 0 ? 'linear-gradient(135deg, rgba(147,51,234,0.35), rgba(79,70,229,0.35))' : 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(147,51,234,0.35)',
              color: 'white',
            }}
          >
            Continue <ChevronRight className="w-3.5 h-3.5" />
          </button>

        </div>
      );
    }

    // ── Step 2: Enter addresses ──
    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center justify-between mb-1">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Back
          </button>
          <span className="text-[11px] text-gray-500">
            {hasAtLeastOneWallet
              ? <span className="text-green-400">{filledCount}/{selectedNets.length} filled</span>
              : <span>{selectedNets.length} wallet{selectedNets.length > 1 ? 's' : ''} selected</span>}
          </span>
        </div>

        <div className="space-y-2">
          {selectedNets.map(net => {
            const value = wallets[net.key];
            const error = validationErrors[net.key];
            const filled = !!value?.trim();
            const valid = filled && !error;

            return (
              <div
                key={net.key}
                className="rounded-lg border transition-all duration-150"
                style={{
                  borderColor: error ? 'rgba(239,68,68,0.35)' : valid ? `${net.color}35` : 'rgba(255,255,255,0.07)',
                  background: error ? 'rgba(239,68,68,0.03)' : valid ? `${net.color}06` : undefined,
                }}
              >
                <div className="flex items-center gap-2.5 px-3 py-2">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: `${net.color}15` }}
                  >
                    <img src={net.logo} alt={net.shortLabel} className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-400 w-10 flex-shrink-0">{net.shortLabel}</span>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleWalletChange(net.key, e.target.value)}
                    placeholder={net.placeholder}
                    disabled={isSubmitting}
                    className="flex-1 bg-transparent text-white text-xs font-mono placeholder:text-white/15 outline-none min-w-0"
                  />
                  {valid && (
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${net.color}20` }}>
                      <Check className="w-2.5 h-2.5" style={{ color: net.color }} />
                    </div>
                  )}
                </div>
                {error && (
                  <div className="px-3 pb-1.5 -mt-0.5">
                    <p className="text-[10px] text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-2.5 h-2.5 flex-shrink-0" />{error}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !hasAtLeastOneWallet}
          className="w-full py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-35 disabled:cursor-not-allowed"
          style={{
            background: hasAtLeastOneWallet ? 'linear-gradient(135deg, rgba(147,51,234,0.35), rgba(79,70,229,0.35))' : 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(147,51,234,0.35)',
            color: 'white',
          }}
        >
          {isSubmitting ? 'Saving...' : `Save Wallet${filledCount > 1 ? 's' : ''}`}
        </button>
      </form>
    );
  };

  // ── Step dots ──
  const stepDots = inputMode === 'wallet' ? (
    <div className="flex items-center justify-center gap-2 mb-4">
      <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 1 ? 'w-6 bg-purple-500' : 'w-2 bg-white/25'}`} />
      <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 2 ? 'w-6 bg-purple-500' : 'w-2 bg-white/25'}`} />
    </div>
  ) : null;

  const title = inputMode === 'access_code' ? 'Access Code' : step === 1 ? 'Select Wallets' : 'Enter Addresses';
  const subtitle = inputMode === 'access_code'
    ? 'Enter your forensic access code'
    : step === 1 ? 'Which networks do you use?' : 'Add your wallet addresses below';

  // ── Inline version ──
  if (!isPopup) {
    return (
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-xl overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-10 rounded-2xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
              <Wallet className="text-purple-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{title}</h2>
              <p className="text-gray-500 text-xs">{subtitle}</p>
            </div>
          </div>
          {stepDots}
          {innerContent()}
        </div>
      </div>
    );
  }

  // ── Popup version ──
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative max-w-md w-full mx-4">
        {/* Required badge - outside card so never clipped */}
        <div className="flex justify-center mb-[-10px] relative z-30">
          <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-purple-500/30">
            Required
          </span>
        </div>

        <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 pt-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-10 rounded-2xl" />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
              <Wallet className="text-purple-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{title}</h2>
              <p className="text-gray-500 text-xs">{subtitle}</p>
            </div>
          </div>

          {stepDots}
          {innerContent()}

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.05]">
            <button
              type="button"
              onClick={() => { setInputMode('access_code'); setValidationError(''); setAccessCode(''); }}
              className="text-[11px] text-gray-500 hover:text-purple-400 transition-colors"
            >
              Have an access code? <span className="underline">Enter it here</span>
            </button>
            <button type="button" onClick={() => navigate('/profile')} className="text-[11px] text-purple-400/70 hover:text-purple-300 transition-colors">
              Profile →
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default AddWalletPopup;
