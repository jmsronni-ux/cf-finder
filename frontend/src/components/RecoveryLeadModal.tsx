import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '@/utils/api';
import PhoneInput from '@/components/PhoneInput';

interface RecoveryLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  network: string;
  networkName: string;
  threatIndex: number;
  severity: string;
  balance: number;
  currency: string;
  isGeneralInquiry?: boolean;
}

type ModalStep = 'form' | 'success';

const RecoveryLeadModal: React.FC<RecoveryLeadModalProps> = ({
  isOpen,
  onClose,
  walletAddress,
  network,
  networkName,
  threatIndex,
  severity,
  balance,
  currency,
  isGeneralInquiry = false,
}) => {
  const [step, setStep] = useState<ModalStep>('form');
  const [searchParams] = useSearchParams();
  const subid = searchParams.get('subid');
  const [phone, setPhone] = useState('');
  const [phoneBlurred, setPhoneBlurred] = useState(false);
  const [contactMethod, setContactMethod] = useState<'telegram' | 'whatsapp'>('telegram');
  const [contactHandle, setContactHandle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messengerFocused, setMessengerFocused] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const validatePhone = (raw: string): { valid: boolean; error: string | null } => {
    const digits = raw.replace(/\D/g, '');
    if (!raw.trim()) return { valid: false, error: 'Phone number is required' };
    if (digits.length < 7) return { valid: false, error: 'Too short — enter a full phone number' };
    if (digits.length > 15) return { valid: false, error: 'Too long — max 15 digits (E.164)' };
    if (/^(\d)\1+$/.test(digits)) return { valid: false, error: 'Enter a real phone number' };
    return { valid: true, error: null };
  };

  const phoneValidation = validatePhone(phone);
  const showPhoneError = phoneBlurred && !phoneValidation.valid && phone.length > 0;

  useEffect(() => {
    if (isOpen && step === 'form') {
      setTimeout(() => phoneRef.current?.focus(), 200);
    }
  }, [isOpen, step]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('form');
        setPhone('');
        setPhoneBlurred(false);
        setContactHandle('');
        setError(null);
      }, 300);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPhoneBlurred(true);

    const pv = validatePhone(phone);
    if (!pv.valid) {
      setError(pv.error);
      return;
    }

    setIsSubmitting(true);

    try {
      const body: Record<string, any> = {
        walletAddress,
        network,
        phone: phone.trim(),
        threatIndex,
        severity,
        balance,
        currency,
        subid,
      };

      if (contactHandle.trim()) {
        if (contactMethod === 'telegram') {
          body.telegram = contactHandle.trim();
        } else {
          body.whatsapp = contactHandle.trim();
        }
      }

      const res = await apiFetch('/scanner-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (json.success) {
        setStep('success');
      } else {
        setError(json.message || 'Something went wrong. Try again.');
      }
    } catch {
      setError('Connection error. Check your internet.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const severityColor: Record<string, string> = {
    clear: '#22c55e',
    low: '#eab308',
    moderate: '#f97316',
    critical: '#ef4444',
  };
  const threatColor = isGeneralInquiry ? '#10b981' : (severityColor[severity] || '#22c55e');

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{ perspective: '1200px' }}
    >
      {/* Backdrop — dark with subtle color tint from threat */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(ellipse at center, ${threatColor}08 0%, rgba(0,0,0,0.85) 70%)`,
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-[420px] sm:max-w-[440px] mx-4 mb-0 sm:mb-0"
        style={{
          animation: 'modalSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <style>{`
          @keyframes modalSlideUp {
            from { opacity: 0; transform: translateY(24px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes checkDraw {
            from { stroke-dashoffset: 24; }
            to { stroke-dashoffset: 0; }
          }
          @keyframes fadeStagger {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Top accent line matching threat color */}
        <div
          className="h-[2px] rounded-t-xl"
          style={{ background: `linear-gradient(90deg, transparent, ${threatColor}60, transparent)` }}
        />

        <div className="bg-[#0c0c0c] border border-white/[0.07] border-t-0 rounded-b-xl sm:rounded-xl sm:border-t overflow-hidden">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center text-gray-600 hover:text-gray-300 transition-colors z-10 rounded-md hover:bg-white/[0.04]"
            aria-label="Close"
          >
            <span className="text-sm leading-none">✕</span>
          </button>

          {step === 'form' ? (
            <div className="px-6 sm:px-7 pt-6 pb-7">
              {/* Header */}
              <p
                className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] mb-3"
                style={{ color: threatColor }}
              >
                {isGeneralInquiry ? 'Free Consultation' : 'Recovery Analysis'}
              </p>
              <h2 className="text-[22px] font-semibold text-white leading-tight tracking-[-0.02em]">
                {isGeneralInquiry ? 'Speak with a Recovery Expert' : 'Unlock your full recovery assessment'}
              </h2>
              <p className="text-sm text-gray-400 mt-2 leading-relaxed max-w-[340px]">
                {isGeneralInquiry 
                  ? 'Enter your phone number below for a 100% Free Consultation to discuss your situation and see if your lost funds can be tracked.'
                  : <><span className="text-white font-medium">100% Free Consultation</span> with a Recovery Specialist to review your trace path and explore recovery options.</>}
              </p>

              {/* Wallet context — hide if general inquiry */}
              {!isGeneralInquiry && (
                <div className="mt-5 flex items-baseline gap-3 text-xs text-gray-500 font-mono">
                  <span className="text-gray-600">wallet</span>
                  <span className="text-gray-400">
                    {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
                  </span>
                  <span className="text-gray-600">·</span>
                  <span className="text-gray-400">{networkName}</span>
                  <span className="text-gray-600">·</span>
                  <span style={{ color: threatColor }}>
                    {threatIndex}/100
                  </span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {/* Phone */}
                <div>
                  <label className="flex items-baseline justify-between mb-2">
                    <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Phone</span>
                    <span className="text-[10px] text-gray-600">required</span>
                  </label>
                  <PhoneInput
                    inputRef={phoneRef}
                    onFullNumberChange={(full) => { setPhone(full); setError(null); }}
                    onBlur={() => setPhoneBlurred(true)}
                    isValid={phoneValidation.valid}
                    showError={showPhoneError}
                    color={threatColor}
                    defaultCountry="GB"
                  />
                  {showPhoneError && (
                    <p className="text-[12px] text-red-400 mt-1.5 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                      {phoneValidation.error}
                    </p>
                  )}
                </div>

                {/* Messenger — progressive disclosure */}
                <div>
                  <label className="flex items-baseline justify-between mb-2">
                    <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Messenger</span>
                    <span className="text-[10px] text-gray-600">optional</span>
                  </label>
                  <div className="flex gap-0 mb-2">
                    {(['telegram', 'whatsapp'] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setContactMethod(method)}
                        className="flex-1 py-2 text-[11px] font-medium uppercase tracking-wider border transition-all duration-150"
                        style={{
                          borderColor: contactMethod === method ? `${threatColor}40` : 'rgba(255,255,255,0.05)',
                          color: contactMethod === method ? threatColor : '#6b7280',
                          backgroundColor: contactMethod === method ? `${threatColor}08` : 'transparent',
                          borderRadius: method === 'telegram' ? '6px 0 0 6px' : '0 6px 6px 0',
                        }}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={contactHandle}
                    onChange={(e) => setContactHandle(e.target.value)}
                    onFocus={() => setMessengerFocused(true)}
                    onBlur={() => setMessengerFocused(false)}
                    placeholder={contactMethod === 'telegram' ? '@username' : '+1 555 000 0000'}
                    className="w-full bg-transparent border rounded-lg px-4 py-3 text-[15px] text-white placeholder:text-gray-700 focus:outline-none transition-all duration-200"
                    style={{
                      borderColor: messengerFocused ? `${threatColor}50` : 'rgba(255,255,255,0.06)',
                      boxShadow: messengerFocused ? `0 0 0 3px ${threatColor}10` : 'none',
                    }}
                    autoComplete="off"
                  />
                </div>

                {/* Error */}
                {error && (
                  <p className="text-[13px] text-red-400 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                    {error}
                  </p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-lg text-[14px] font-semibold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: isSubmitting ? `${threatColor}60` : threatColor,
                    boxShadow: isSubmitting ? 'none' : `0 4px 24px ${threatColor}30`,
                  }}
                  onMouseEnter={(e) => !isSubmitting && ((e.target as HTMLElement).style.transform = 'translateY(-1px)')}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.transform = 'translateY(0)')}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending…
                    </span>
                  ) : (
                    'Claim Free Consultation →'
                  )}
                </button>
              </form>

              {/* Trust line — single row, not a separate section */}
              <p className="text-[10px] text-gray-600 text-center mt-4 tracking-wide">
                Encrypted · Avg. 2h response · No payment required
              </p>
            </div>
          ) : (
            /* ── Success ── */
            <div className="px-6 sm:px-7 pt-8 pb-7">
              {/* Animated check */}
              <div className="mb-6">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="22" stroke={threatColor} strokeWidth="1.5" opacity="0.2" />
                  <circle cx="24" cy="24" r="22" stroke={threatColor} strokeWidth="1.5" strokeDasharray="138" strokeDashoffset="0"
                    style={{ animation: 'checkDraw 0.6s ease-out forwards' }} />
                  <path d="M16 24.5L21.5 30L32 19" stroke={threatColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    fill="none" strokeDasharray="24" strokeDashoffset="0"
                    style={{ animation: 'checkDraw 0.4s 0.3s ease-out forwards' }} />
                </svg>
              </div>

              <h2 className="text-xl font-semibold text-white tracking-[-0.01em]">
                We'll be in touch
              </h2>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                Your case file has been created. A specialist will contact you within 2 hours.
              </p>

              {/* Upsell — subtle, not a card */}
              <div className="mt-8 pt-6 border-t border-white/[0.05]">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 mb-3">
                  Want faster processing?
                </p>
                <p className="text-[13px] text-gray-400 leading-relaxed mb-5">
                  Registered users get a personal case dashboard and priority in our queue.
                </p>

                <Link
                  to="/register"
                  className="flex items-center justify-center w-full py-3.5 rounded-lg text-[14px] font-semibold transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid rgba(255,255,255,0.08)`,
                    color: '#e5e5e5',
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
                    (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                    (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                  }}
                >
                  Create Free Account →
                </Link>

                <button
                  onClick={onClose}
                  className="w-full mt-2 py-3 text-[13px] text-gray-600 hover:text-gray-400 transition-colors"
                >
                  I'll wait for the team to reach out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecoveryLeadModal;
