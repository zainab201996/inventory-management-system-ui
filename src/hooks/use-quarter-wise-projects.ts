import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { QuarterWiseProjectsReport } from '@/types';

interface UseQuarterWiseProjectsReturn {
  quarterData: QuarterWiseProjectsReport | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseQuarterWiseProjectsOptions {
  enabled?: boolean;
  dept_id?: number;
  from_date?: string; // YYYY-MM-DD format
  to_date?: string; // YYYY-MM-DD format
}

export function useQuarterWiseProjects(
  options: UseQuarterWiseProjectsOptions = {}
): UseQuarterWiseProjectsReturn {
  const { enabled = true, dept_id, from_date, to_date } = options;
  const [quarterData, setQuarterData] = useState<QuarterWiseProjectsReport | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchQuarterData = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      setError(null);
      const filters: { dept_id?: number; from_date?: string; to_date?: string } = {};
      if (dept_id !== undefined) filters.dept_id = dept_id;
      if (from_date) filters.from_date = from_date;
      if (to_date) filters.to_date = to_date;
      const response = await apiClient.getQuarterWiseProjects(Object.keys(filters).length > 0 ? filters : undefined);
      
      if (response.success && response.data) {
        setQuarterData(response.data);
      } else {
        setError(response.message || 'Failed to fetch quarter-wise projects');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [enabled, dept_id, from_date, to_date]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return;
    }

    fetchQuarterData();
  }, [fetchQuarterData]);

  return {
    quarterData,
    loading,
    error,
    refetch: fetchQuarterData,
  };
}
