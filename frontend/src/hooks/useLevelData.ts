import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

interface LevelData {
  level: number;
  name: string;
  description: string;
  nodes: any[];
  edges: any[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
  };
}

interface UseLevelDataReturn {
  levels: LevelData[];
  getLevel: (levelNumber: number) => LevelData | undefined;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useLevelData = (): UseLevelDataReturn => {
  const [levels, setLevels] = useState<LevelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLevels = async () => {
    try {
      console.log('[useLevelData] Starting to fetch levels...');
      setLoading(true);
      setError(null);
      
      const response = await apiFetch('/level');
      console.log('[useLevelData] Response status:', response.status);
      const data = await response.json();
      console.log('[useLevelData] Response data:', data);
      
      if (response.ok && data.success) {
        console.log('[useLevelData] Setting levels:', data.data.levels);
        setLevels(data.data.levels);
      } else {
        throw new Error(data.message || 'Failed to fetch levels');
      }
    } catch (err) {
      console.error('[useLevelData] Error fetching levels:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch levels');
    } finally {
      setLoading(false);
    }
  };

  const getLevel = (levelNumber: number): LevelData | undefined => {
    return levels.find(level => level.level === levelNumber);
  };

  useEffect(() => {
    fetchLevels();
  }, []);

  return {
    levels,
    getLevel,
    loading,
    error,
    refetch: fetchLevels
  };
};
