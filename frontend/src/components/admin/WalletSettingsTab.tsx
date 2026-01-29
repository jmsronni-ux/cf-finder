import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import {
  Loader2,
  Save,
  Wallet,
  Copy,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Check
} from 'lucide-react';
import { apiFetch } from '../../utils/api';

interface GlobalSettingsData {
  _id: string;
  btcAddress: string;
  usdtAddress: string;
  ethAddress: string;
  bcyAddress: string;
  bethAddress: string;
  updatedAt: string;
}

type CryptoKey = 'BTC' | 'ETH' | 'USDT' | 'BCY' | 'BETH';

interface CryptoConfig {
  key: CryptoKey;
  dbKey: string;
  name: string;
  fullName: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  isTestnet: boolean;
  placeholder: string;
}

const cryptoConfigs: CryptoConfig[] = [
  {
    key: 'BTC',
    dbKey: 'btcAddress',
    name: 'BTC',
    fullName: 'Bitcoin',
    icon: '/assets/crypto-logos/bitcoin-btc-logo.svg',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    isTestnet: false,
    placeholder: 'bc1q... or 1A1zP1...'
  },
  {
    key: 'ETH',
    dbKey: 'ethAddress',
    name: 'ETH',
    fullName: 'Ethereum',
    icon: '/assets/crypto-logos/ethereum-eth-logo.svg',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    isTestnet: false,
    placeholder: '0x...'
  },
  {
    key: 'USDT',
    dbKey: 'usdtAddress',
    name: 'USDT',
    fullName: 'Tether (ERC-20)',
    icon: '/assets/crypto-logos/tether-usdt-logo.svg',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    isTestnet: false,
    placeholder: '0x...'
  },
  {
    key: 'BCY',
    dbKey: 'bcyAddress',
    name: 'BCY',
    fullName: 'Bitcoin Testnet',
    icon: '/assets/crypto-logos/bitcoin-btc-logo.svg',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    isTestnet: true,
    placeholder: 'BlockCypher test address'
  },
  {
    key: 'BETH',
    dbKey: 'bethAddress',
    name: 'BETH',
    fullName: 'Ethereum Testnet',
    icon: '/assets/crypto-logos/ethereum-eth-logo.svg',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    isTestnet: true,
    placeholder: 'BlockCypher test address'
  }
];

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

const WalletSettingsTab: React.FC = () => {
  const { token } = useAuth();

  const [settings, setSettings] = useState<GlobalSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [copiedKey, setCopiedKey] = useState<CryptoKey | null>(null);

  const [addresses, setAddresses] = useState<Record<CryptoKey, string>>({
    BTC: '',
    ETH: '',
    USDT: '',
    BCY: '',
    BETH: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/global-settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setSettings(data.data);
        setAddresses({
          BTC: data.data.btcAddress || '',
          ETH: data.data.ethAddress || '',
          USDT: data.data.usdtAddress || '',
          BCY: data.data.bcyAddress || '',
          BETH: data.data.bethAddress || ''
        });
      } else {
        toast.error(data.message || 'Failed to fetch settings');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('An error occurred while fetching settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddressChange = (key: CryptoKey, value: string) => {
    setAddresses(prev => ({ ...prev, [key]: value }));
  };

  const handleCopy = (key: CryptoKey) => {
    const address = addresses[key];
    if (address) {
      navigator.clipboard.writeText(address);
      setCopiedKey(key);
      toast.success('Address copied!');
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSyncStatus('syncing');

      const response = await apiFetch('/global-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          btcAddress: addresses.BTC,
          ethAddress: addresses.ETH,
          usdtAddress: addresses.USDT,
          bcyAddress: addresses.BCY,
          bethAddress: addresses.BETH
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSettings(data.data);
        setSyncStatus('success');
        toast.success('Wallet addresses saved & synced!');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } else {
        setSyncStatus('error');
        toast.error(data.message || 'Failed to save');
      }
    } catch (error) {
      console.error('Error saving:', error);
      setSyncStatus('error');
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const mainnetCryptos = cryptoConfigs.filter(c => !c.isTestnet);
  const testnetCryptos = cryptoConfigs.filter(c => c.isTestnet);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Wallet size={24} className="text-purple-400" />
            Forwarding Wallets
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Destination addresses for automatic fund forwarding
          </p>
        </div>
        <div className="flex items-center gap-3">
          {syncStatus === 'idle' && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <RefreshCw size={12} />
              Auto-syncs on save
            </span>
          )}
          {syncStatus === 'syncing' && (
            <span className="text-xs text-yellow-500 flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />
              Syncing...
            </span>
          )}
          {syncStatus === 'success' && (
            <span className="text-xs text-green-500 flex items-center gap-1">
              <CheckCircle2 size={12} />
              Synced
            </span>
          )}
          {syncStatus === 'error' && (
            <span className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={12} />
              Sync failed
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className={`px-4 text-white ${
              syncStatus === 'success'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : syncStatus === 'success' ? (
              <CheckCircle2 size={16} />
            ) : (
              <>
                <Save size={14} className="mr-1.5" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Cards Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Mainnet Addresses */}
        <Card className="border border-border rounded-xl overflow-hidden">
          <CardHeader className="py-3 px-4 bg-white/[0.02] border-b border-border">
            <CardTitle className="text-sm font-medium text-gray-300">
              Mainnet
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {mainnetCryptos.map((crypto, index) => (
              <div
                key={crypto.key}
                className={`flex items-center gap-2 p-3 ${
                  index !== mainnetCryptos.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-lg ${crypto.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <img src={crypto.icon} alt={crypto.name} className="w-4 h-4" />
                </div>
                <Input
                  type="text"
                  value={addresses[crypto.key]}
                  onChange={(e) => handleAddressChange(crypto.key, e.target.value)}
                  placeholder={`${crypto.name} address`}
                  className="bg-white/5 border border-white/10 font-mono text-xs h-8 flex-1"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(crypto.key)}
                  disabled={!addresses[crypto.key]}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 border ${
                    addresses[crypto.key]
                      ? 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300 hover:text-white'
                      : 'bg-white/[0.02] border-white/5 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {copiedKey === crypto.key ? (
                    <Check size={14} className="text-green-500" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Testnet Addresses */}
        <Card className="border border-border rounded-xl overflow-hidden">
          <CardHeader className="py-3 px-4 bg-white/[0.02] border-b border-border">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              Testnet
              <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                Test networks
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {testnetCryptos.map((crypto, index) => (
              <div
                key={crypto.key}
                className={`flex items-center gap-2 p-3 ${
                  index !== testnetCryptos.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-lg ${crypto.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <img src={crypto.icon} alt={crypto.name} className="w-4 h-4 opacity-70" />
                </div>
                <Input
                  type="text"
                  value={addresses[crypto.key]}
                  onChange={(e) => handleAddressChange(crypto.key, e.target.value)}
                  placeholder={`${crypto.name} address`}
                  className="bg-white/5 border border-white/10 font-mono text-xs h-8 flex-1"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(crypto.key)}
                  disabled={!addresses[crypto.key]}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 border ${
                    addresses[crypto.key]
                      ? 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300 hover:text-white'
                      : 'bg-white/[0.02] border-white/5 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {copiedKey === crypto.key ? (
                    <Check size={14} className="text-green-500" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Last saved */}
      {settings?.updatedAt && (
        <p className="text-xs text-gray-500">
          Last saved: {new Date(settings.updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
};

export default WalletSettingsTab;
