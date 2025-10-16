import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { 
  Upload, 
  Download, 
  Save, 
  Trash2, 
  ArrowLeft, 
  FileText, 
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import MaxWidthWrapper from '../components/helpers/max-width-wrapper';
import MagicBadge from '../components/ui/magic-badge';
import { useLevelData } from '../hooks/useLevelData';
import { apiFetch } from '../utils/api';

interface LevelUploadData {
  level: number;
  name: string;
  description: string;
  nodes: any[];
  edges: any[];
}

const AdminLevelManagement: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { levels, loading, error, refetch } = useLevelData();
  
  const [uploading, setUploading] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [uploadData, setUploadData] = useState<LevelUploadData | null>(null);

  // Check if user is admin
  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen text-foreground flex items-center justify-center">
        <Card className="border-red-500/50 max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">You don't have permission to access this page. Admin privileges required.</p>
            <Button onClick={() => navigate('/profile')} variant="outline">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        
        // Validate the JSON structure
        if (!jsonData.nodes || !Array.isArray(jsonData.nodes)) {
          throw new Error('Invalid JSON: missing or invalid nodes array');
        }
        if (!jsonData.edges || !Array.isArray(jsonData.edges)) {
          throw new Error('Invalid JSON: missing or invalid edges array');
        }

        const levelNumber = parseInt(prompt('Enter level number (1-5):') || '');
        if (isNaN(levelNumber) || levelNumber < 1 || levelNumber > 5) {
          toast.error('Please enter a valid level number (1-5)');
          return;
        }

        setSelectedLevel(levelNumber);
        setUploadData({
          level: levelNumber,
          name: `Level ${levelNumber}`,
          description: `Animation level ${levelNumber}`,
          nodes: jsonData.nodes,
          edges: jsonData.edges
        });

        toast.success(`Level ${levelNumber} data loaded successfully!`);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        toast.error('Invalid JSON file. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  const handleSaveLevel = async () => {
    if (!uploadData || !token) return;

    setUploading(true);
    try {
      const response = await apiFetch(`/level/${uploadData.level}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: uploadData.name,
          description: uploadData.description,
          nodes: uploadData.nodes,
          edges: uploadData.edges
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Level ${uploadData.level} updated successfully!`);
        setUploadData(null);
        setSelectedLevel(null);
        refetch();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        toast.error(data.message || 'Failed to update level');
      }
    } catch (error) {
      console.error('Error updating level:', error);
      toast.error('An error occurred while updating the level');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadLevel = async (levelNumber: number) => {
    try {
      const response = await apiFetch(`/level/${levelNumber}`);
      const data = await response.json();

      if (response.ok && data.success) {
        const level = data.data.level;
        const exportData = {
          nodes: level.nodes,
          edges: level.edges
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `level-${levelNumber === 1 ? 'one' : levelNumber === 2 ? 'two' : levelNumber === 3 ? 'three' : levelNumber === 4 ? 'four' : 'five'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success(`Level ${levelNumber} downloaded successfully!`);
      } else {
        toast.error(data.message || 'Failed to download level');
      }
    } catch (error) {
      console.error('Error downloading level:', error);
      toast.error('An error occurred while downloading the level');
    }
  };

  const handleDeleteLevel = async (levelNumber: number) => {
    if (!confirm(`Are you sure you want to delete Level ${levelNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await apiFetch(`/level/${levelNumber}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Level ${levelNumber} deleted successfully!`);
        refetch();
      } else {
        toast.error(data.message || 'Failed to delete level');
      }
    } catch (error) {
      console.error('Error deleting level:', error);
      toast.error('An error occurred while deleting the level');
    }
  };

  return (
    <>
      <div id="admin-level-management" className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-20" />
      <div className="min-h-screen text-foreground overflow-x-hidden scrollbar-hide">
        <MaxWidthWrapper>
          <div className="pt-20 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-heading text-foreground">
                  Level <br/> <span className="text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text">
                    Management
                  </span>
                </h1>
                <p className="text-muted-foreground mt-4">Manage animation level data and upload new configurations</p>
              </div>
              <div className="flex flex-col flex-wrap gap-2">
                <Button onClick={() => navigate('/profile')} className="text-white bg-transparent flex items-center gap-2 border border-border py-1 px-4 rounded-md hover:bg-border/50">
                  <ArrowLeft size={16} />
                  Back
                </Button>
                <Button onClick={refetch} className="bg-blue-600/50 hover:bg-blue-700 text-white flex items-center gap-2 border border-blue-600">
                  <RefreshCw size={16} />
                  Refresh
                </Button>
              </div>
            </div>

            <MagicBadge title="Upload New Level Data" className="mb-6"/>

            {/* Upload Section */}
            <Card className="border border-border rounded-xl mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Level JSON File
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  
                  {uploadData && (
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="font-semibold text-green-400">Level {uploadData.level} Ready for Upload</span>
                      </div>
                      <p className="text-sm text-green-300 mb-3">
                        {uploadData.nodes.length} nodes, {uploadData.edges.length} edges
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSaveLevel}
                          disabled={uploading}
                          className="bg-green-600/50 hover:bg-green-700 text-white flex items-center gap-2"
                        >
                          {uploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          {uploading ? 'Uploading...' : 'Save to Database'}
                        </Button>
                        <Button
                          onClick={() => {
                            setUploadData(null);
                            setSelectedLevel(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <MagicBadge title="Current Levels in Database" className="mt-10 mb-6"/>

            {/* Levels List */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : error ? (
              <div className="w-full border border-red-500/50 rounded-xl p-10 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-400 mb-2">Error loading levels</p>
                <p className="text-sm text-red-300">{error}</p>
              </div>
            ) : levels.length === 0 ? (
              <div className="w-full border border-border rounded-xl p-10 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No levels found in database</p>
                <p className="text-sm text-muted-foreground">Upload level JSON files to get started</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {levels.map((level) => (
                  <Card key={level.level} className="border border-border rounded-xl hover:border-purple-500/50 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center">
                            <span className="font-bold text-lg">{level.level}</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold">{level.name}</h3>
                            <p className="text-sm text-muted-foreground">{level.description}</p>
                          </div>
                        </div>
                        <Badge className="bg-green-500/20 text-green-500 border border-green-500/50">
                          Active
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <div>
                            <p className="text-xs text-gray-400">Nodes</p>
                            <p className="font-bold">{level.nodes.length}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-500" />
                          <div>
                            <p className="text-xs text-gray-400">Edges</p>
                            <p className="font-bold">{level.edges.length}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-xs text-gray-400">Updated</p>
                            <p className="font-bold text-sm">{new Date(level.metadata.updatedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                        <Button
                          onClick={() => handleDownloadLevel(level.level)}
                          className="flex-1 bg-blue-600/50 hover:bg-blue-700 text-white flex items-center justify-center gap-2 border border-blue-600"
                        >
                          <Download className="w-4 h-4" />
                          Download JSON
                        </Button>
                        <Button
                          onClick={() => handleDeleteLevel(level.level)}
                          className="bg-red-600/50 hover:bg-red-700 text-white flex items-center justify-center gap-2 border border-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </MaxWidthWrapper>
      </div>
    </>
  );
};

export default AdminLevelManagement;
