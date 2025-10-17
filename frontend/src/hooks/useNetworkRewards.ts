import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

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
  getUserLevelRewards: (userId: string, level: number) => Promise<NetworkRewards>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useNetworkRewards = (): UseNetworkRewardsReturn => {
  const [rewards, setRewards] = useState<LevelRewards>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

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

  const getUserLevelRewards = async (userId: string, level: number): Promise<NetworkRewards> => {
    try {
      const response = await apiFetch(`/user-network-reward/user/${userId}/level/${level}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Convert the response to our NetworkRewards format
        const userRewards: NetworkRewards = {};
        Object.entries(data.data.rewards).forEach(([network, rewardData]: [string, any]) => {
          userRewards[network] = rewardData.amount;
        });
        return userRewards;
      }
      return {};
    } catch (error) {
      console.error('Error fetching user level rewards:', error);
      return {};
    }
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  return {
    rewards,
    getLevelRewards,
    getTotalRewardForLevel,
    getNetworkReward,
    getUserLevelRewards,
    loading,
    error,
    refetch: fetchRewards
  };
};
