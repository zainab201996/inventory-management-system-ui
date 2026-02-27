import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { IssuesByCauseReport } from '@/types';

interface UseIssuesByCauseOptions {
  enabled?: boolean;
  dept_id?: number;
  from_date?: string; // YYYY-MM-DD format
  to_date?: string; // YYYY-MM-DD format
}

interface UseIssuesByCauseReturn {
  issuesByCause: IssuesByCauseReport | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useIssuesByCause(
  options: UseIssuesByCauseOptions = {}
): UseIssuesByCauseReturn {
  const { enabled = true, dept_id, from_date, to_date } = options;
  const [issuesByCause, setIssuesByCause] = useState<IssuesByCauseReport | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchIssuesByCause = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      setError(null);
      const filters: { dept_id?: number; from_date?: string; to_date?: string } = {};
      if (dept_id !== undefined) filters.dept_id = dept_id;
      if (from_date) filters.from_date = from_date;
      if (to_date) filters.to_date = to_date;
      const response = await apiClient.getIssuesByCause(Object.keys(filters).length > 0 ? filters : undefined);
      
      if (response.success && response.data) {
        setIssuesByCause(response.data);
      } else {
        setError(response.message || 'Failed to fetch issues by cause');
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

    fetchIssuesByCause();
  }, [fetchIssuesByCause, enabled]);

  return {
    issuesByCause,
    loading,
    error,
    refetch: fetchIssuesByCause,
  };
}
