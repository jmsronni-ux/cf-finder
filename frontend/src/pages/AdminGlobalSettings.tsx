import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
import MaxWidthWrapper from '../components/helpers/max-width-wrapper';
import MagicBadge from '../components/ui/magic-badge';
import AdminNavigation from '../components/AdminNavigation';
import { apiFetch } from '../utils/api';

interface GlobalSettingsData {
  _id: string;
  topupWalletAddress: string;
  topupQrCodeUrl: string;
  updatedAt: string;
}

const AdminGlobalSettings: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  
  const [settings, setSettings] = useState<GlobalSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');

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
        setWalletAddress(data.data.topupWalletAddress || '');
        setQrCodeUrl(data.data.topupQrCodeUrl || '');
        // Check if URL is a base64 image (uploaded file)
        if (data.data.topupQrCodeUrl && data.data.topupQrCodeUrl.startsWith('data:image')) {
          setUploadedFileName('Uploaded QR Code');
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setQrCodeUrl(base64String);
        setUploadedFileName(file.name);
        toast.success('QR code image uploaded successfully!');
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

  const handleRemoveImage = () => {
    setQrCodeUrl('');
    setUploadedFileName('');
    toast.info('QR code image removed');
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
          topupWalletAddress: walletAddress,
          topupQrCodeUrl: qrCodeUrl
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
                      These settings will be displayed in the top-up request popup for all users
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Wallet Address */}
                    <div className="space-y-2">
                      <Label htmlFor="walletAddress" className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Wallet size={16} className="text-purple-400" />
                        Wallet Address
                      </Label>
                      <Input
                        id="walletAddress"
                        type="text"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8"
                        className="bg-background/50 border-border focus:border-purple-500/50 font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        The wallet address where users will send their top-up payments
                      </p>
                    </div>

                    {/* QR Code Upload */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <QrCode size={16} className="text-purple-400" />
                        QR Code Image
                      </Label>
                      
                      {/* Upload Button or Display Current Image */}
                      {!qrCodeUrl ? (
                        <div className="flex flex-col gap-2">
                          <label 
                            htmlFor="qrCodeUpload"
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all text-gray-300 hover:text-white"
                          >
                            <Upload size={18} />
                            <span>Upload QR Code Image</span>
                          </label>
                          <input
                            id="qrCodeUpload"
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <p className="text-xs text-muted-foreground">
                            Upload a QR code image (max 2MB, PNG/JPG/GIF)
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <div className="flex items-center gap-2">
                              <QrCode size={18} className="text-green-400" />
                              <span className="text-sm text-green-300">
                                {uploadedFileName || 'QR Code Set'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="p-1 hover:bg-red-500/20 rounded transition-colors"
                            >
                              <XIcon size={16} className="text-red-400" />
                            </button>
                          </div>
                          <label 
                            htmlFor="qrCodeUpload"
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all text-sm text-gray-400 hover:text-white"
                          >
                            <Upload size={14} />
                            <span>Change Image</span>
                          </label>
                          <input
                            id="qrCodeUpload"
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </div>
                      )}
                      
                      {/* Alternative: Paste URL */}
                      <div className="pt-3 border-t border-border/50">
                        <Label htmlFor="qrCodeUrl" className="text-xs text-muted-foreground mb-2 block">
                          Or paste image URL:
                        </Label>
                        <Input
                          id="qrCodeUrl"
                          type="text"
                          value={qrCodeUrl.startsWith('data:image') ? '' : qrCodeUrl}
                          onChange={(e) => {
                            setQrCodeUrl(e.target.value);
                            setUploadedFileName('');
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
                          Save Settings
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
                      How it will appear to users in the top-up popup
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* QR Code Preview */}
                    <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-lg p-6">
                      {qrCodeUrl ? (
                        <div className="w-48 h-48 rounded-lg flex items-center justify-center border border-white/20 mb-3 overflow-hidden bg-white">
                          <img 
                            src={qrCodeUrl} 
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
                      <label className="text-sm text-gray-400 font-medium">Wallet Address</label>
                      <div className="flex flex-row">
                        <input
                          type="text"
                          value={walletAddress || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8'}
                          readOnly
                          className="w-full bg-white/5 text-white px-4 py-3 rounded-lg border border-white/10 text-sm font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(walletAddress || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8');
                            toast.success('Wallet address copied!');
                          }}
                          className="bg-white/5 border border-white/10 aspect-square size-12 rounded-lg flex items-center justify-center ms-2 text-white hover:bg-purple-500/20 hover:text-purple-500 transition-colors text-sm font-medium"
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

