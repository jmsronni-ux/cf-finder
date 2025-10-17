import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

interface NetworkRewards {
  [network: string]: number;
}

interface LevelRewards {
  [level: number]: NetworkRewards;
}

interface UseNetworkRewardsReturn {
  rewards: LevelRewards;
  getLevelRewards: (level: number) => NetworkRewards;
  getTotalRewardForLevel: (level: number) => number;
  getNetworkReward: (level: number, network: string) => number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useNetworkRewards = (): UseNetworkRewardsReturn => {
  const [rewards, setRewards] = useState<LevelRewards>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRewards = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiFetch('/network-reward/summary');
      const data = await response.json();
      
      if (response.ok && data.success) {
        setRewards(data.data.summary.byLevel || {});
      } else {
        throw new Error(data.message || 'Failed to fetch network rewards');
      }
    } catch (err) {
      console.error('Error fetching network rewards:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch network rewards');
    } finally {
      setLoading(false);
    }
  };

  const getLevelRewards = (level: number): NetworkRewards => {
    return rewards[level] || {};
  };

  const getTotalRewardForLevel = (level: number): number => {
    const levelRewards = rewards[level] || {};
    return Object.values(levelRewards).reduce((sum, amount) => sum + amount, 0);
  };

  const getNetworkReward = (level: number, network: string): number => {
    const levelRewards = rewards[level] || {};
    return levelRewards[network] || 0;
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  return {
    rewards,
    getLevelRewards,
    getTotalRewardForLevel,
    getNetworkReward,
    loading,
    error,
    refetch: fetchRewards
  };
};
