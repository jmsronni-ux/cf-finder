import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';

interface ConversionRate {
  network: string;
  rateToUSD: number;
  isAuto?: boolean;
  metadata: {
    createdAt: string;
    updatedAt: string;
    updatedBy?: string;
  };
}

interface ConversionRatesMap {
  [network: string]: number;
}

interface UseConversionRatesReturn {
  rates: ConversionRate[];
  ratesMap: ConversionRatesMap;
  isAuto: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateRates: (rates: ConversionRatesMap, isAuto?: boolean) => Promise<boolean>;
}

export const useConversionRates = (): UseConversionRatesReturn => {
  const [rates, setRates] = useState<ConversionRate[]>([]);
  const [ratesMap, setRatesMap] = useState<ConversionRatesMap>({});
  const [isAuto, setIsAuto] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = useCallback(async () => {
    try {
      console.log('[useConversionRates] Fetching conversion rates...');
      setLoading(true);
      setError(null);

      const response = await apiFetch(`/conversion-rate?t=${Date.now()}`);
      console.log('[useConversionRates] Response status:', response.status);
      const data = await response.json();
      console.log('[useConversionRates] Response data:', data);

      if (response.ok && data.success) {
        console.log('[useConversionRates] Setting rates:', data.data.rates);
        setRates(data.data.rates);

        // Create map for easy access and check isAuto status
        const map: ConversionRatesMap = {};
        let autoStatus = false;

        if (data.data.rates && Array.isArray(data.data.rates)) {
          data.data.rates.forEach((rate: ConversionRate) => {
            if (rate && rate.network && rate.rateToUSD !== undefined) {
              map[rate.network] = rate.rateToUSD;
            }
            // Check if any rate is set to auto (they should all be synced)
            if (rate.isAuto) {
              autoStatus = true;
            }
          });
        }
        setRatesMap(map);
        setIsAuto(autoStatus);
        console.log('[useConversionRates] Created rates map:', map, 'Auto mode:', autoStatus);
      } else {
        throw new Error(data.message || 'Failed to fetch conversion rates');
      }
    } catch (err) {
      console.error('[useConversionRates] Error fetching rates:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch conversion rates');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateRates = useCallback(async (newRates: ConversionRatesMap, newIsAuto?: boolean): Promise<boolean> => {
    try {
      console.log('[useConversionRates] Updating rates:', newRates);

      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await apiFetch('/conversion-rate', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rates: newRates,
          isAuto: newIsAuto
        })
      });

      const data = await response.json();
      console.log('[useConversionRates] Update response:', data);

      if (response.ok && data.success) {
        // Refetch to get updated data
        await fetchRates();
        return true;
      } else {
        throw new Error(data.message || 'Failed to update conversion rates');
      }
    } catch (err) {
      console.error('[useConversionRates] Error updating rates:', err);
      setError(err instanceof Error ? err.message : 'Failed to update conversion rates');
      return false;
    }
  }, [fetchRates]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  return {
    rates,
    ratesMap,
    isAuto,
    loading,
    error,
    refetch: fetchRates,
    updateRates
  };
};

