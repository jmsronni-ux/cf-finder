import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Loader2, X, Wallet, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../utils/api';
import { validateWalletAddress } from '../utils/walletValidation';

interface WalletAddresses {
  btc?: string;
  eth?: string;
  tron?: string;
  usdtErc20?: string;
}

interface AddWalletProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onWalletsSaved?: () => void;
}

const ChangeWallet: React.FC<AddWalletProps> = ({ isOpen, onClose, token, onWalletsSaved }) => {
  const [wallets, setWallets] = useState<WalletAddresses | null>(null);
  const [savingWallets, setSavingWallets] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  useEffect(() => {
    const fetchWallets = async () => {
      if (!token || !isOpen) return;
      try {
        const res = await apiFetch('/user/me/wallets', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        const json = await res.json();
        if (res.ok && json?.success !== false) {
          setWallets({
            btc: json?.data?.btc || '',
            eth: json?.data?.eth || '',
            tron: json?.data?.tron || '',
            usdtErc20: json?.data?.usdtErc20 || ''
          });
        }
      } catch (e) {
        console.error('Failed to fetch wallets');
      }
    };
    fetchWallets();
  }, [token, isOpen]);

  const handleWalletChange = (value: string) => {
    setWallets(prev => ({ ...(prev || {}), btc: value }));
    
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError('');
    }
    
    // Validate on change if there's a value
    if (value.trim()) {
      const validation = validateWalletAddress(value, 'btc');
      if (!validation.isValid) {
        setValidationError(validation.error || 'Invalid BTC wallet address');
      }
    }
  };

  const saveWallets = async (): Promise<void> => {
    if (!token || !wallets) return;
    
    // Validate BTC wallet address before saving
    if (wallets.btc && wallets.btc.trim()) {
      const validation = validateWalletAddress(wallets.btc, 'btc');
      if (!validation.isValid) {
        setValidationError(validation.error || 'Invalid BTC wallet address');
        toast.error(validation.error || 'Invalid BTC wallet address');
        return;
      }
    } else {
      setValidationError('Please enter a BTC wallet address');
      toast.error('Please enter a BTC wallet address');
      return;
    }
    
    setSavingWallets(true);
    
    try {
      const res = await apiFetch('/user/me/wallets', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ wallets })
      });
      
      const json = await res.json();
      
      if (res.ok && json?.success) {
        toast.success('Wallet saved successfully!');
        if (onWalletsSaved) {
          onWalletsSaved();
        }
        onClose();
      } else {
        toast.error(json?.message || 'Failed to save wallet');
      }
    } catch (e) {
      toast.error('Failed to save wallet');
    } finally {
      setSavingWallets(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <Card className="border border-border bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Wallet className="w-6 h-6 text-[#F7931A]" />
              Change Bitcoin Wallet
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
          <div className={`rounded-lg p-3 mb-4 transition-all ${
            validationError 
              ? 'bg-red-500/10 border border-red-500/30' 
              : 'bg-[#F7931A]/10 border border-[#F7931A]/20'
          }`}>
            <p className={`text-xs ${validationError ? 'text-red-400' : 'text-[#F7931A]'}`}>
              <AlertCircle className="w-4 h-4 inline mr-2" />
              {validationError || 'Incorrect addresses may result in loss of funds.'}
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#F7931A] mb-2">Bitcoin (BTC) Wallet Address</label>
              <input
                className={`w-full px-3 py-2 bg-background/50 border rounded text-foreground placeholder:text-muted-foreground focus:outline-none font-mono text-sm transition-all ${
                  validationError 
                    ? 'border-red-500/50 focus:border-red-500' 
                    : 'border-border focus:border-[#F7931A]'
                }`}
                value={wallets?.btc || ''}
                onChange={(e) => handleWalletChange(e.target.value)}
                placeholder="BTC Wallet Address"
              />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <Button 
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={savingWallets}
            >
              Cancel
            </Button>
            <Button 
              onClick={saveWallets} 
              disabled={savingWallets} 
              className="flex-1 bg-[#F7931A]/40 hover:bg-[#F7931A]/60 text-white flex items-center justify-center gap-2 border border-[#F7931A]"
            >
              {savingWallets ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Wallet'}
            </Button>
          </div>
        </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChangeWallet;

