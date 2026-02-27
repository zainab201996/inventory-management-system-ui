import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { FundingSourceMixReport } from '@/types';

interface UseFundingSourceMixOptions {
  enabled?: boolean;
  ptype_id?: number;
  status?: number;
  dept_id?: number;
  from_date?: string; // YYYY-MM-DD format
  to_date?: string; // YYYY-MM-DD format
}

interface UseFundingSourceMixReturn {
  fundingSourceMix: FundingSourceMixReport | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFundingSourceMix(
  options: UseFundingSourceMixOptions = {}
): UseFundingSourceMixReturn {
  const { enabled = true, ptype_id, status, dept_id, from_date, to_date } = options;
  const [fundingSourceMix, setFundingSourceMix] = useState<FundingSourceMixReport | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchFundingSourceMix = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      setError(null);
      const filters: { ptype_id?: number; status?: number; dept_id?: number; from_date?: string; to_date?: string } = {};
      if (ptype_id !== undefined) filters.ptype_id = ptype_id;
      if (status !== undefined) filters.status = status;
      if (dept_id !== undefined) filters.dept_id = dept_id;
      if (from_date) filters.from_date = from_date;
      if (to_date) filters.to_date = to_date;
      
      const response = await apiClient.getFundingSourceMix(filters);
      
      if (response.success && response.data) {
        // Debug logging
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
          console.log('Funding Source Mix API Response:', response.data);
        }
        setFundingSourceMix(response.data);
      } else {
        setError(response.message || 'Failed to fetch funding source mix');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [enabled, ptype_id, status, dept_id, from_date, to_date]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return;
    }

    fetchFundingSourceMix();
  }, [fetchFundingSourceMix]);

  return {
    fundingSourceMix,
    loading,
    error,
    refetch: fetchFundingSourceMix,
  };
}
