import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { KPIsReport, KPIsFilters } from '@/types';

interface UseKPIsReturn {
  kpis: KPIsReport | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseKPIsOptions {
  enabled?: boolean;
  filters?: KPIsFilters;
}

export function useKPIs(options: UseKPIsOptions = {}): UseKPIsReturn {
  const { enabled = true, filters = {} } = options;
  const [kpis, setKPIs] = useState<KPIsReport | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  // Memoize filters to avoid unnecessary re-renders
  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchKPIs = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getKPIsReport(memoizedFilters);
      
      if (response.success && response.data) {
        setKPIs(response.data);
      } else {
        setError(response.message || 'Failed to fetch KPIs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [enabled, memoizedFilters]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return;
    }

    fetchKPIs();
  }, [fetchKPIs]);

  return {
    kpis,
    loading,
    error,
    refetch: fetchKPIs,
  };
}
