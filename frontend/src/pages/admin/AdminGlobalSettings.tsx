import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import {
  Settings,
  Loader2,
  Save,
  Wallet,
  QrCode,
  ImageIcon,
  Copy,
  Upload,
  X as XIcon
} from 'lucide-react';
import MaxWidthWrapper from '../../components/helpers/max-width-wrapper';
import MagicBadge from '../../components/ui/magic-badge';
import AdminNavigation from '../../components/AdminNavigation';
import { apiFetch } from '../../utils/api';

interface GlobalSettingsData {
  _id: string;
  btcAddress: string;
  btcQrCodeUrl: string;
  usdtAddress: string;
  usdtQrCodeUrl: string;
  ethAddress: string;
  ethQrCodeUrl: string;
  updatedAt: string;
}

type CryptoType = 'BTC' | 'USDT' | 'ETH';

const cryptoOptions = [
  { key: 'BTC' as CryptoType, name: 'BTC', icon: '/assets/crypto-logos/bitcoin-btc-logo.svg', color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  { key: 'USDT' as CryptoType, name: 'USDT', icon: '/assets/crypto-logos/tether-usdt-logo.svg', color: 'text-green-500', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' },
  { key: 'ETH' as CryptoType, name: 'ETH', icon: '/assets/crypto-logos/ethereum-eth-logo.svg', color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
];

const AdminGlobalSettings: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<GlobalSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoType>('BTC');

  // State for all crypto addresses and QR codes
  const [btcAddress, setBtcAddress] = useState('');
  const [btcQrCodeUrl, setBtcQrCodeUrl] = useState('');
  const [btcUploadedFileName, setBtcUploadedFileName] = useState('');

  const [usdtAddress, setUsdtAddress] = useState('');
  const [usdtQrCodeUrl, setUsdtQrCodeUrl] = useState('');
  const [usdtUploadedFileName, setUsdtUploadedFileName] = useState('');

  const [ethAddress, setEthAddress] = useState('');
  const [ethQrCodeUrl, setEthQrCodeUrl] = useState('');
  const [ethUploadedFileName, setEthUploadedFileName] = useState('');

  useEffect(() => {
    if (!user?.isAdmin) {
      toast.error('Access Denied: Admin privileges required.');
      navigate('/profile');
    } else {
      fetchSettings();
    }
  }, [user, navigate]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/global-settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setSettings(data.data);

        // BTC
        setBtcAddress(data.data.btcAddress || '');
        setBtcQrCodeUrl(data.data.btcQrCodeUrl || '');
        if (data.data.btcQrCodeUrl && data.data.btcQrCodeUrl.startsWith('data:image')) {
          setBtcUploadedFileName('Uploaded QR Code');
        }

        // USDT
        setUsdtAddress(data.data.usdtAddress || '');
        setUsdtQrCodeUrl(data.data.usdtQrCodeUrl || '');
        if (data.data.usdtQrCodeUrl && data.data.usdtQrCodeUrl.startsWith('data:image')) {
          setUsdtUploadedFileName('Uploaded QR Code');
        }

        // ETH
        setEthAddress(data.data.ethAddress || '');
        setEthQrCodeUrl(data.data.ethQrCodeUrl || '');
        if (data.data.ethQrCodeUrl && data.data.ethQrCodeUrl.startsWith('data:image')) {
          setEthUploadedFileName('Uploaded QR Code');
        }
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, cryptoType: CryptoType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;

        if (cryptoType === 'BTC') {
          setBtcQrCodeUrl(base64String);
          setBtcUploadedFileName(file.name);
        } else if (cryptoType === 'USDT') {
          setUsdtQrCodeUrl(base64String);
          setUsdtUploadedFileName(file.name);
        } else if (cryptoType === 'ETH') {
          setEthQrCodeUrl(base64String);
          setEthUploadedFileName(file.name);
        }

        toast.success(`${cryptoType} QR code uploaded successfully!`);
      };
      reader.onerror = () => {
        toast.error('Failed to read file');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('An error occurred while uploading the file');
    }
  };

  const handleRemoveImage = (cryptoType: CryptoType) => {
    if (cryptoType === 'BTC') {
      setBtcQrCodeUrl('');
      setBtcUploadedFileName('');
    } else if (cryptoType === 'USDT') {
      setUsdtQrCodeUrl('');
      setUsdtUploadedFileName('');
    } else if (cryptoType === 'ETH') {
      setEthQrCodeUrl('');
      setEthUploadedFileName('');
    }
    toast.info(`${cryptoType} QR code removed`);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const response = await apiFetch('/global-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          btcAddress,
          btcQrCodeUrl,
          usdtAddress,
          usdtQrCodeUrl,
          ethAddress,
          ethQrCodeUrl
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSettings(data.data);
        toast.success('Global settings updated successfully!');
      } else {
        toast.error(data.message || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('An error occurred while updating settings');
    } finally {
      setSaving(false);
    }
  };

  // Get current crypto data based on selection
  const getCurrentCryptoData = () => {
    if (selectedCrypto === 'BTC') {
      return { address: btcAddress, setAddress: setBtcAddress, qrCodeUrl: btcQrCodeUrl, setQrCodeUrl: setBtcQrCodeUrl, uploadedFileName: btcUploadedFileName };
    } else if (selectedCrypto === 'USDT') {
      return { address: usdtAddress, setAddress: setUsdtAddress, qrCodeUrl: usdtQrCodeUrl, setQrCodeUrl: setUsdtQrCodeUrl, uploadedFileName: usdtUploadedFileName };
    } else {
      return { address: ethAddress, setAddress: setEthAddress, qrCodeUrl: ethQrCodeUrl, setQrCodeUrl: setEthQrCodeUrl, uploadedFileName: ethUploadedFileName };
    }
  };

  const currentCrypto = getCurrentCryptoData();
  const selectedCryptoInfo = cryptoOptions.find(c => c.key === selectedCrypto)!;

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <>
      <div id="admin-global-settings" className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-20" />
      <div className="min-h-screen text-foreground overflow-x-hidden scrollbar-hide">
        <MaxWidthWrapper>
          <div className="pt-20 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-heading text-foreground">
                  Global <br /> <span className="text-transparent bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text">
                    Settings
                  </span>
                </h1>
                <p className="text-muted-foreground mt-4">Configure global settings for all users</p>
              </div>
            </div>

            {/* Admin Navigation */}
            <AdminNavigation />

            <MagicBadge title="Global Settings Management" className="mb-6" />

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Settings Form */}
                <Card className="border border-border rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-purple-400 flex items-center gap-2">
                      <Settings size={24} />
                      Top-Up Request Settings
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Configure wallet addresses and QR codes for multiple cryptocurrencies
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Crypto Selector Tabs */}
                    <div className="flex gap-2 p-1 bg-white/5 rounded-lg border border-white/10">
                      {cryptoOptions.map((crypto) => (
                        <button
                          key={crypto.key}
                          onClick={() => setSelectedCrypto(crypto.key)}
                          className={`flex-1 px-4 py-2 rounded-md font-medium transition-all flex flex-col items-center justify-center ${selectedCrypto === crypto.key
                              ? `${crypto.bgColor} ${crypto.borderColor} border text-white`
                              : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                          <img 
                            src={crypto.icon} 
                            alt={crypto.name} 
                            className={`w-6 h-6 ${selectedCrypto === crypto.key ? '' : 'opacity-70'}`}
                          />
                          <span className="text-xs mt-1">{crypto.name}</span>
                        </button>
                      ))}
                    </div>

                    {/* Wallet Address */}
                    <div className="space-y-2">
                      <Label htmlFor="walletAddress" className={`text-sm font-medium flex items-center gap-2 ${selectedCryptoInfo.color}`}>
                        <Wallet size={16} />
                        {selectedCryptoInfo.name} Wallet Address
                      </Label>
                      <Input
                        id="walletAddress"
                        type="text"
                        value={currentCrypto.address}
                        onChange={(e) => currentCrypto.setAddress(e.target.value)}
                        placeholder={`Enter ${selectedCryptoInfo.name} wallet address`}
                        className="bg-background/50 border-border focus:border-purple-500/50 font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        The wallet address where users will send their {selectedCryptoInfo.name} top-up payments
                      </p>
                    </div>

                    {/* QR Code Upload */}
                    <div className="space-y-2">
                      <Label className={`text-sm font-medium flex items-center gap-2 ${selectedCryptoInfo.color}`}>
                        <QrCode size={16} />
                        QR Code Image
                      </Label>

                      {/* Upload Button or Display Current Image */}
                      {!currentCrypto.qrCodeUrl ? (
                        <div className="flex flex-col gap-2">
                          <label
                            htmlFor={`qrCodeUpload-${selectedCrypto}`}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all text-gray-300 hover:text-white"
                          >
                            <Upload size={18} />
                            <span>Upload QR Code Image</span>
                          </label>
                          <input
                            id={`qrCodeUpload-${selectedCrypto}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, selectedCrypto)}
                            className="hidden"
                          />
                          <p className="text-xs text-muted-foreground">
                            Upload a QR code image (max 2MB, PNG/JPG/GIF)
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className={`flex items-center justify-between p-3 ${selectedCryptoInfo.bgColor} border ${selectedCryptoInfo.borderColor} rounded-lg`}>
                            <div className="flex items-center gap-2">
                              <QrCode size={18} className={selectedCryptoInfo.color} />
                              <span className={`text-sm ${selectedCryptoInfo.color}`}>
                                {currentCrypto.uploadedFileName || 'QR Code Set'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(selectedCrypto)}
                              className="p-1 hover:bg-red-500/20 rounded transition-colors"
                            >
                              <XIcon size={16} className="text-red-400" />
                            </button>
                          </div>
                          <label
                            htmlFor={`qrCodeUpload-${selectedCrypto}`}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all text-sm text-gray-400 hover:text-white"
                          >
                            <Upload size={14} />
                            <span>Change Image</span>
                          </label>
                          <input
                            id={`qrCodeUpload-${selectedCrypto}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, selectedCrypto)}
                            className="hidden"
                          />
                        </div>
                      )}

                      {/* Alternative: Paste URL */}
                      <div className="pt-3 border-t border-border/50">
                        <Label htmlFor={`qrCodeUrl-${selectedCrypto}`} className="text-xs text-muted-foreground mb-2 block">
                          Or paste image URL:
                        </Label>
                        <Input
                          id={`qrCodeUrl-${selectedCrypto}`}
                          type="text"
                          value={currentCrypto.qrCodeUrl.startsWith('data:image') ? '' : currentCrypto.qrCodeUrl}
                          onChange={(e) => {
                            currentCrypto.setQrCodeUrl(e.target.value);
                            if (selectedCrypto === 'BTC') setBtcUploadedFileName('');
                            else if (selectedCrypto === 'USDT') setUsdtUploadedFileName('');
                            else setEthUploadedFileName('');
                          }}
                          placeholder="https://example.com/qr-code.png"
                          className="bg-background/50 border-border focus:border-purple-500/50 text-sm"
                        />
                      </div>
                    </div>

                    {/* Last Updated */}
                    {settings?.updatedAt && (
                      <div className="pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          Last updated: {new Date(settings.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {/* Save Button */}
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full bg-purple-600/50 hover:bg-purple-700 text-white border border-purple-600"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} className="mr-2" />
                          Save All Settings
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Preview */}
                <Card className="border border-border rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-purple-400 flex items-center gap-2">
                      <ImageIcon size={24} />
                      Preview
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      How {selectedCryptoInfo.name} will appear to users in the top-up popup
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* QR Code Preview */}
                    <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-lg p-6">
                      {currentCrypto.qrCodeUrl ? (
                        <div className="w-48 h-48 rounded-lg flex items-center justify-center border border-white/20 mb-3 overflow-hidden bg-white">
                          <img
                            src={currentCrypto.qrCodeUrl}
                            alt="QR Code"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement!.innerHTML = '<div class="text-center text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg><p class="text-xs">Invalid Image URL</p></div>';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-48 h-48 bg-gradient-to-br from-white/10 to-white/5 rounded-lg flex items-center justify-center border border-white/20 mb-3">
                          <div className="text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 text-gray-400">
                              <rect x="3" y="3" width="7" height="7"></rect>
                              <rect x="14" y="3" width="7" height="7"></rect>
                              <rect x="14" y="14" width="7" height="7"></rect>
                              <rect x="3" y="14" width="7" height="7"></rect>
                            </svg>
                            <p className="text-gray-500 text-xs">QR Code Placeholder</p>
                          </div>
                        </div>
                      )}
                      <p className="text-gray-400 text-sm">Scan to get wallet address</p>
                    </div>

                    {/* Wallet Address Preview */}
                    <div className="space-y-2">
                      <label className={`text-sm font-medium flex items-center gap-2 ${selectedCryptoInfo.color}`}>
                        <img 
                          src={selectedCryptoInfo.icon} 
                          alt={selectedCryptoInfo.name} 
                          className="w-5 h-5"
                        />
                        {selectedCryptoInfo.name} Wallet Address
                      </label>
                      <div className="flex flex-row">
                        <input
                          type="text"
                          value={currentCrypto.address || `No ${selectedCryptoInfo.name} address set`}
                          readOnly
                          className="w-full bg-white/5 text-white px-4 py-3 rounded-lg border border-white/10 text-sm font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (currentCrypto.address) {
                              navigator.clipboard.writeText(currentCrypto.address);
                              toast.success('Wallet address copied!');
                            }
                          }}
                          disabled={!currentCrypto.address}
                          className="bg-white/5 border border-white/10 aspect-square size-12 rounded-lg flex items-center justify-center ms-2 text-white hover:bg-purple-500/20 hover:text-purple-500 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-gray-500 text-xs">Send your top-up amount to this address</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </MaxWidthWrapper>
      </div>
    </>
  );
};

export default AdminGlobalSettings;
