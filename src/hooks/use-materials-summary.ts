import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { MaterialsSummaryReport } from '@/types';

interface UseMaterialsSummaryOptions {
  enabled?: boolean;
  from_date?: string; // YYYY-MM-DD format
  to_date?: string; // YYYY-MM-DD format
}

interface UseMaterialsSummaryReturn {
  materialsSummary: MaterialsSummaryReport | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMaterialsSummary(
  options: UseMaterialsSummaryOptions = {}
): UseMaterialsSummaryReturn {
  const { enabled = true, from_date, to_date } = options;
  const [materialsSummary, setMaterialsSummary] = useState<MaterialsSummaryReport | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchMaterialsSummary = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      setError(null);
      const filters = from_date || to_date ? { from_date, to_date } : undefined;
      const response = await apiClient.getMaterialsSummary(filters);
      
      if (response.success && response.data) {
        setMaterialsSummary(response.data);
      } else {
        setError(response.message || 'Failed to fetch materials summary');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [enabled, from_date, to_date]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return;
    }

    fetchMaterialsSummary();
  }, [fetchMaterialsSummary, enabled]);

  return {
    materialsSummary,
    loading,
    error,
    refetch: fetchMaterialsSummary,
  };
}
