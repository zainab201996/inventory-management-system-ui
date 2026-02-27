import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { Circle, CircleFilters } from '@/types';

interface UseCirclesReturn {
  circles: Circle[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  refetch: () => Promise<void>;
  createCircle: (circleData: { name: string; description?: string }) => Promise<Circle | null>;
  updateCircle: (id: number, circleData: { name?: string; description?: string }) => Promise<Circle | null>;
  deleteCircle: (id: number) => Promise<boolean>;
}

export function useCircles(filters: CircleFilters = {}): UseCirclesReturn {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchCircles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getCircles({ ...memoizedFilters, all: true });
      
      if (response.success && response.data) {
        const circlesData = Array.isArray(response.data) 
          ? response.data 
          : (response.data as any).circles || [];
        setCircles(circlesData);
        setPagination((response.data as any).pagination || null);
      } else {
        setError(response.message || 'Failed to fetch circles');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  const createCircle = useCallback(async (circleData: { name: string; description?: string }) => {
    try {
      setError(null);
      const response = await apiClient.createCircle(circleData);
      
      if (response.success) {
        await fetchCircles();
        return response.data ?? null;
      } else {
        setError(response.message || 'Failed to create circle');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchCircles]);

  const updateCircle = useCallback(async (id: number, circleData: { name?: string; description?: string }) => {
    try {
      setError(null);
      const response = await apiClient.updateCircle(id, circleData);
      
      if (response.success) {
        await fetchCircles();
        return response.data ?? null;
      } else {
        setError(response.message || 'Failed to update circle');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchCircles]);

  const deleteCircle = useCallback(async (id: number) => {
    try {
      setError(null);
      const response = await apiClient.deleteCircle(id);
      
      if (response.success) {
        await fetchCircles();
        return true;
      } else {
        setError(response.message || 'Failed to delete circle');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchCircles]);

  useEffect(() => {
    fetchCircles();
  }, [fetchCircles]);

  return {
    circles,
    loading,
    error,
    pagination,
    refetch: fetchCircles,
    createCircle,
    updateCircle,
    deleteCircle,
  };
}
