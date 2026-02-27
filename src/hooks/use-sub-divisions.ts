import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { SubDivision, SubDivisionFilters } from '@/types';

interface UseSubDivisionsReturn {
  subDivisions: SubDivision[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  refetch: () => Promise<void>;
  createSubDivision: (subDivisionData: { name: string; division_id: number; description?: string }) => Promise<SubDivision | null>;
  updateSubDivision: (id: number, subDivisionData: { name?: string; division_id?: number; description?: string }) => Promise<SubDivision | null>;
  deleteSubDivision: (id: number) => Promise<boolean>;
}

export function useSubDivisions(filters: SubDivisionFilters = {}): UseSubDivisionsReturn {
  const [subDivisions, setSubDivisions] = useState<SubDivision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchSubDivisions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getSubDivisions({ ...memoizedFilters, all: true });
      
      if (response.success && response.data) {
        const subDivisionsData = Array.isArray(response.data) 
          ? response.data 
          : (response.data as any).sub_divisions || (response.data as any).subDivisions || [];
        setSubDivisions(subDivisionsData);
        setPagination((response.data as any).pagination || null);
      } else {
        setError(response.message || 'Failed to fetch sub divisions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  const createSubDivision = useCallback(async (subDivisionData: { name: string; division_id: number; description?: string }) => {
    try {
      setError(null);
      const response = await apiClient.createSubDivision(subDivisionData);
      
      if (response.success) {
        await fetchSubDivisions();
        return response.data ?? null;
      } else {
        setError(response.message || 'Failed to create sub division');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchSubDivisions]);

  const updateSubDivision = useCallback(async (id: number, subDivisionData: { name?: string; division_id?: number; description?: string }) => {
    try {
      setError(null);
      const response = await apiClient.updateSubDivision(id, subDivisionData);
      
      if (response.success) {
        await fetchSubDivisions();
        return response.data ?? null;
      } else {
        setError(response.message || 'Failed to update sub division');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchSubDivisions]);

  const deleteSubDivision = useCallback(async (id: number) => {
    try {
      setError(null);
      const response = await apiClient.deleteSubDivision(id);
      
      if (response.success) {
        await fetchSubDivisions();
        return true;
      } else {
        setError(response.message || 'Failed to delete sub division');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchSubDivisions]);

  useEffect(() => {
    fetchSubDivisions();
  }, [fetchSubDivisions]);

  return {
    subDivisions,
    loading,
    error,
    pagination,
    refetch: fetchSubDivisions,
    createSubDivision,
    updateSubDivision,
    deleteSubDivision,
  };
}
