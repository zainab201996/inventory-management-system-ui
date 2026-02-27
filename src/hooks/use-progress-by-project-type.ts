import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { ProgressByProjectTypeReport } from '@/types';

interface UseProgressByProjectTypeReturn {
  progressData: ProgressByProjectTypeReport | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseProgressByProjectTypeOptions {
  enabled?: boolean;
  dept_id?: number;
  from_date?: string; // YYYY-MM-DD format
  to_date?: string; // YYYY-MM-DD format
}

export function useProgressByProjectType(
  options: UseProgressByProjectTypeOptions = {}
): UseProgressByProjectTypeReturn {
  const { enabled = true, dept_id, from_date, to_date } = options;
  const [progressData, setProgressData] = useState<ProgressByProjectTypeReport | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      setError(null);
      const filters: { dept_id?: number; from_date?: string; to_date?: string } = {};
      if (dept_id !== undefined) filters.dept_id = dept_id;
      if (from_date) filters.from_date = from_date;
      if (to_date) filters.to_date = to_date;
      const response = await apiClient.getProgressByProjectType(Object.keys(filters).length > 0 ? filters : undefined);
      
      if (response.success && response.data) {
        setProgressData(response.data);
      } else {
        setError(response.message || 'Failed to fetch progress by project type');
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

    fetchProgress();
  }, [fetchProgress]);

  return {
    progressData,
    loading,
    error,
    refetch: fetchProgress,
  };
}
