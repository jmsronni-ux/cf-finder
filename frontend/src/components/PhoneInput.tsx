import React, { useState, useRef, useEffect, useCallback } from 'react';

// ─── Country Data ─────────────────────────────────────────────────────────────

interface Country {
  code: string;
  name: string;
  dialCode: string;
  placeholder: string; // local number example
}

// Pinned at top of dropdown
const PINNED_CODES = ['GB', 'US', 'CA', 'AU', 'DE', 'FR', 'AE', 'RU'];

const COUNTRIES: Country[] = [
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', placeholder: '7911 123456' },
  { code: 'US', name: 'United States',  dialCode: '+1',  placeholder: '555 000 0000' },
  { code: 'CA', name: 'Canada',         dialCode: '+1',  placeholder: '555 000 0000' },
  { code: 'AU', name: 'Australia',      dialCode: '+61', placeholder: '412 345 678' },
  { code: 'DE', name: 'Germany',        dialCode: '+49', placeholder: '1512 3456789' },
  { code: 'FR', name: 'France',         dialCode: '+33', placeholder: '6 12 34 56 78' },
  { code: 'IT', name: 'Italy',          dialCode: '+39', placeholder: '312 345 6789' },
  { code: 'ES', name: 'Spain',          dialCode: '+34', placeholder: '612 345 678' },
  { code: 'NL', name: 'Netherlands',    dialCode: '+31', placeholder: '6 12345678' },
  { code: 'BE', name: 'Belgium',        dialCode: '+32', placeholder: '470 12 34 56' },
  { code: 'CH', name: 'Switzerland',    dialCode: '+41', placeholder: '78 123 45 67' },
  { code: 'AT', name: 'Austria',        dialCode: '+43', placeholder: '664 123456' },
  { code: 'SE', name: 'Sweden',         dialCode: '+46', placeholder: '70 123 45 67' },
  { code: 'NO', name: 'Norway',         dialCode: '+47', placeholder: '412 34 567' },
  { code: 'DK', name: 'Denmark',        dialCode: '+45', placeholder: '20 12 34 56' },
  { code: 'FI', name: 'Finland',        dialCode: '+358', placeholder: '50 123 4567' },
  { code: 'PL', name: 'Poland',         dialCode: '+48', placeholder: '512 345 678' },
  { code: 'CZ', name: 'Czech Republic', dialCode: '+420', placeholder: '601 123 456' },
  { code: 'HU', name: 'Hungary',        dialCode: '+36', placeholder: '20 123 4567' },
  { code: 'RO', name: 'Romania',        dialCode: '+40', placeholder: '712 345 678' },
  { code: 'PT', name: 'Portugal',       dialCode: '+351', placeholder: '912 345 678' },
  { code: 'GR', name: 'Greece',         dialCode: '+30', placeholder: '691 234 5678' },
  { code: 'IE', name: 'Ireland',        dialCode: '+353', placeholder: '85 123 4567' },
  { code: 'HR', name: 'Croatia',        dialCode: '+385', placeholder: '91 234 5678' },
  { code: 'UA', name: 'Ukraine',        dialCode: '+380', placeholder: '67 123 4567' },
  { code: 'RU', name: 'Russia',         dialCode: '+7',  placeholder: '912 345 6789' },
  { code: 'TR', name: 'Turkey',         dialCode: '+90', placeholder: '532 123 4567' },
  { code: 'IL', name: 'Israel',         dialCode: '+972', placeholder: '52 123 4567' },
  { code: 'SA', name: 'Saudi Arabia',   dialCode: '+966', placeholder: '51 234 5678' },
  { code: 'AE', name: 'UAE',            dialCode: '+971', placeholder: '50 123 4567' },
  { code: 'EG', name: 'Egypt',          dialCode: '+20', placeholder: '100 123 4567' },
  { code: 'ZA', name: 'South Africa',   dialCode: '+27', placeholder: '71 234 5678' },
  { code: 'NG', name: 'Nigeria',        dialCode: '+234', placeholder: '803 123 4567' },
  { code: 'KE', name: 'Kenya',          dialCode: '+254', placeholder: '712 345 678' },
  { code: 'GH', name: 'Ghana',          dialCode: '+233', placeholder: '20 123 4567' },
  { code: 'IN', name: 'India',          dialCode: '+91', placeholder: '98765 43210' },
  { code: 'PK', name: 'Pakistan',       dialCode: '+92', placeholder: '301 2345678' },
  { code: 'BD', name: 'Bangladesh',     dialCode: '+880', placeholder: '1812 345678' },
  { code: 'SG', name: 'Singapore',      dialCode: '+65', placeholder: '8123 4567' },
  { code: 'MY', name: 'Malaysia',       dialCode: '+60', placeholder: '12 345 6789' },
  { code: 'TH', name: 'Thailand',       dialCode: '+66', placeholder: '81 234 5678' },
  { code: 'ID', name: 'Indonesia',      dialCode: '+62', placeholder: '812 3456789' },
  { code: 'PH', name: 'Philippines',    dialCode: '+63', placeholder: '917 123 4567' },
  { code: 'VN', name: 'Vietnam',        dialCode: '+84', placeholder: '90 123 4567' },
  { code: 'CN', name: 'China',          dialCode: '+86', placeholder: '138 1234 5678' },
  { code: 'JP', name: 'Japan',          dialCode: '+81', placeholder: '90 1234 5678' },
  { code: 'KR', name: 'South Korea',    dialCode: '+82', placeholder: '10 1234 5678' },
  { code: 'HK', name: 'Hong Kong',      dialCode: '+852', placeholder: '5123 4567' },
  { code: 'BR', name: 'Brazil',         dialCode: '+55', placeholder: '11 91234 5678' },
  { code: 'MX', name: 'Mexico',         dialCode: '+52', placeholder: '55 1234 5678' },
  { code: 'AR', name: 'Argentina',      dialCode: '+54', placeholder: '11 1234 5678' },
  { code: 'CL', name: 'Chile',          dialCode: '+56', placeholder: '9 1234 5678' },
  { code: 'CO', name: 'Colombia',       dialCode: '+57', placeholder: '310 123 4567' },
  { code: 'NZ', name: 'New Zealand',    dialCode: '+64', placeholder: '21 123 4567' },
];

// Build sorted list: pinned first, then alphabetical
const PINNED = PINNED_CODES.map(c => COUNTRIES.find(x => x.code === c)!).filter(Boolean);
const REST   = COUNTRIES.filter(c => !PINNED_CODES.includes(c.code)).sort((a, b) => a.name.localeCompare(b.name));

// Generate flag emoji from ISO 2-letter code
const getFlag = (code: string): string => {
  return Array.from(code.toUpperCase())
    .map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
    .join('');
};

// ─── PhoneInput Component ─────────────────────────────────────────────────────

export interface PhoneInputProps {
  id?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onFullNumberChange: (fullNumber: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  isValid?: boolean;
  showError?: boolean;
  color?: string;
  defaultCountry?: string;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  id,
  inputRef,
  onFullNumberChange,
  onFocus,
  onBlur,
  isValid,
  showError,
  color = '#22c55e',
  defaultCountry = 'GB',
}) => {
  const [local, setLocal] = useState('');
  const [selected, setSelected] = useState<Country>(
    () => COUNTRIES.find(c => c.code === defaultCountry) || COUNTRIES[0]
  );
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const [userModified, setUserModified] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLInputElement>(null);

  // Auto-detect country by IP
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data.country_code && !userModified) {
          const detected = COUNTRIES.find(c => c.code === data.country_code);
          if (detected) setSelected(detected);
        }
      })
      .catch(() => { /* fallback silently */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify parent whenever local or country changes
  useEffect(() => {
    onFullNumberChange(selected.dialCode + local.replace(/\s/g, ''));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, selected]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus search when dropdown opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 60);
    }
  }, [open]);

  const handleSelect = useCallback((country: Country) => {
    setSelected(country);
    setUserModified(true);
    setOpen(false);
    setSearch('');
    setTimeout(() => inputRef?.current?.focus(), 60);
  }, [inputRef]);

  const filteredPinned = search
    ? PINNED.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.dialCode.includes(search))
    : PINNED;

  const filteredRest = REST.filter(
    c => c.name.toLowerCase().includes(search.toLowerCase()) || c.dialCode.includes(search)
  );

  const borderColor = showError
    ? 'rgba(239,68,68,0.5)'
    : isValid && local
    ? 'rgba(34,197,94,0.5)'
    : focused ? `${color}60` : 'rgba(255,255,255,0.08)';

  const boxShadow = showError
    ? '0 0 0 3px rgba(239,68,68,0.08)'
    : isValid && local
    ? '0 0 0 3px rgba(34,197,94,0.08)'
    : focused ? `0 0 0 4px ${color}12` : 'none';

  return (
    <div ref={wrapperRef} className="relative">
      {/* Input row */}
      <div
        className="flex items-center border rounded-xl overflow-hidden transition-all duration-200"
        style={{ borderColor, boxShadow, background: 'rgba(255,255,255,0.03)' }}
      >
        {/* Flag / dial-code trigger */}
        <button
          type="button"
          onClick={() => setOpen(prev => !prev)}
          className="flex items-center gap-1.5 pl-3.5 pr-2.5 py-3.5 flex-shrink-0 border-r transition-colors hover:bg-white/[0.04]"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          aria-label="Select country code"
        >
          <span className="text-[18px] leading-none" role="img" aria-label={selected.name}>
            {getFlag(selected.code)}
          </span>
          <span className="text-[13px] font-mono text-gray-300 tabular-nums">{selected.dialCode}</span>
          <svg
            width="10" height="10" viewBox="0 0 10 10" fill="none"
            className="flex-shrink-0 text-gray-600 transition-transform duration-150"
            style={{ transform: open ? 'rotate(180deg)' : 'none' }}
          >
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Local number input */}
        <input
          id={id}
          ref={inputRef}
          type="tel"
          inputMode="tel"
          value={local}
          onChange={e => setLocal(e.target.value)}
          onFocus={() => { setFocused(true); onFocus?.(); }}
          onBlur={() => { setFocused(false); onBlur?.(); }}
          placeholder={selected.placeholder}
          className="flex-1 bg-transparent px-3.5 py-3.5 text-[15px] text-white placeholder:text-gray-700 focus:outline-none"
          autoComplete="tel-national"
        />

        {/* Validation icon */}
        {local.length > 0 && (
          <span className="pr-3.5 flex-shrink-0 pointer-events-none">
            {isValid ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="#22c55e" strokeWidth="1.5" />
                <path d="M5 8L7 10L11 6" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : showError ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="#ef4444" strokeWidth="1.5" />
                <path d="M8 5V8.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="8" cy="11" r="0.75" fill="#ef4444" />
              </svg>
            ) : null}
          </span>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 w-full z-[200] rounded-xl border overflow-hidden"
          style={{
            background: '#111',
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)',
            animation: 'dropdownIn 0.18s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <style>{`
            @keyframes dropdownIn {
              from { opacity: 0; transform: translateY(-6px) scale(0.98); }
              to   { opacity: 1; transform: translateY(0)    scale(1); }
            }
          `}</style>

          {/* Search */}
          <div className="px-3 pt-3 pb-2">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="flex-shrink-0 text-gray-600">
                <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 9L11.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search country or code"
                className="flex-1 bg-transparent text-[13px] text-white placeholder:text-gray-600 focus:outline-none"
              />
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: '220px' }}>
            {/* Pinned */}
            {filteredPinned.length > 0 && (
              <>
                {!search && (
                  <p className="px-4 py-1 text-[10px] font-mono uppercase tracking-wider text-gray-600">Popular</p>
                )}
                {filteredPinned.map(c => (
                  <CountryRow key={`pin-${c.code}`} country={c} selected={selected} onSelect={handleSelect} />
                ))}
                {!search && filteredRest.length > 0 && (
                  <div className="mx-3 my-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                )}
              </>
            )}

            {/* Rest */}
            {filteredRest.map(c => (
              <CountryRow key={c.code} country={c} selected={selected} onSelect={handleSelect} />
            ))}

            {filteredPinned.length === 0 && filteredRest.length === 0 && (
              <p className="px-4 py-6 text-center text-[13px] text-gray-600">No results for "{search}"</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const CountryRow: React.FC<{
  country: Country;
  selected: Country;
  onSelect: (c: Country) => void;
}> = ({ country, selected, onSelect }) => {
  const isSelected = selected.code === country.code;
  return (
    <button
      type="button"
      onClick={() => onSelect(country)}
      className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
      style={{
        background: isSelected ? 'rgba(255,255,255,0.05)' : 'transparent',
      }}
      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <span className="text-[18px] leading-none flex-shrink-0">{getFlag(country.code)}</span>
      <span className="flex-1 text-[13px] text-gray-300 truncate">{country.name}</span>
      <span className="text-[12px] font-mono text-gray-500 flex-shrink-0">{country.dialCode}</span>
      {isSelected && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
          <path d="M2 6L4.5 8.5L10 3.5" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
};

export default PhoneInput;
