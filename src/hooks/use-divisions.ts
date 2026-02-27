import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { Division, DivisionFilters } from '@/types';

interface UseDivisionsReturn {
  divisions: Division[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  refetch: () => Promise<void>;
  createDivision: (divisionData: { name: string; circle_id: number; description?: string }) => Promise<Division | null>;
  updateDivision: (id: number, divisionData: { name?: string; circle_id?: number; description?: string }) => Promise<Division | null>;
  deleteDivision: (id: number) => Promise<boolean>;
}

export function useDivisions(filters: DivisionFilters = {}): UseDivisionsReturn {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchDivisions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getDivisions({ ...memoizedFilters, all: true });
      
      if (response.success && response.data) {
        const divisionsData = Array.isArray(response.data) 
          ? response.data 
          : (response.data as any).divisions || [];
        setDivisions(divisionsData);
        setPagination((response.data as any).pagination || null);
      } else {
        setError(response.message || 'Failed to fetch divisions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  const createDivision = useCallback(async (divisionData: { name: string; circle_id: number; description?: string }) => {
    try {
      setError(null);
      const response = await apiClient.createDivision(divisionData);
      
      if (response.success) {
        await fetchDivisions();
        return response.data ?? null;
      } else {
        setError(response.message || 'Failed to create division');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchDivisions]);

  const updateDivision = useCallback(async (id: number, divisionData: { name?: string; circle_id?: number; description?: string }) => {
    try {
      setError(null);
      const response = await apiClient.updateDivision(id, divisionData);
      
      if (response.success) {
        await fetchDivisions();
        return response.data ?? null;
      } else {
        setError(response.message || 'Failed to update division');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchDivisions]);

  const deleteDivision = useCallback(async (id: number) => {
    try {
      setError(null);
      const response = await apiClient.deleteDivision(id);
      
      if (response.success) {
        await fetchDivisions();
        return true;
      } else {
        setError(response.message || 'Failed to delete division');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchDivisions]);

  useEffect(() => {
    fetchDivisions();
  }, [fetchDivisions]);

  return {
    divisions,
    loading,
    error,
    pagination,
    refetch: fetchDivisions,
    createDivision,
    updateDivision,
    deleteDivision,
  };
}

