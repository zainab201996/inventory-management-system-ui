import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { DelayReason, DelayReasonFilters } from '@/types';

interface UseDelayReasonsReturn {
  delayReasons: DelayReason[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  refetch: () => Promise<void>;
  createDelayReason: (delayReasonData: { d_name: string }) => Promise<DelayReason | null>;
  updateDelayReason: (id: number, delayReasonData: { d_name?: string }) => Promise<DelayReason | null>;
  deleteDelayReason: (id: number) => Promise<boolean>;
}

// Helper function to normalize API response to DelayReason
const normalizeDelayReason = (data: any): DelayReason => {
  return {
    id: data.d_id || data.id,
    name: data.d_name || data.name,
    created_at: data.created_at,
    updated_at: data.updated_at,
    updated_by: data.updated_by,
    updated_by_username: data.updated_by_username,
  };
};

export function useDelayReasons(filters: DelayReasonFilters = {}): UseDelayReasonsReturn {
  const [delayReasons, setDelayReasons] = useState<DelayReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchDelayReasons = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getDelayReasons({ ...memoizedFilters, all: true });
      
      if (response.success && response.data) {
        const delayReasonsData = Array.isArray(response.data) 
          ? response.data.map(normalizeDelayReason)
          : (response.data as any).delayReasons?.map(normalizeDelayReason) || [];
        setDelayReasons(delayReasonsData);
        setPagination((response.data as any).pagination || null);
      } else {
        setError(response.message || 'Failed to fetch delay reasons');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  const createDelayReason = useCallback(async (delayReasonData: { d_name: string }) => {
    try {
      setError(null);
      const response = await apiClient.createDelayReason(delayReasonData);
      
      if (response.success) {
        await fetchDelayReasons();
        return response.data ? normalizeDelayReason(response.data) : null;
      } else {
        setError(response.message || 'Failed to create delay reason');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchDelayReasons]);

  const updateDelayReason = useCallback(async (id: number, delayReasonData: { d_name?: string }) => {
    try {
      setError(null);
      const response = await apiClient.updateDelayReason(id, delayReasonData);
      
      if (response.success) {
        await fetchDelayReasons();
        return response.data ? normalizeDelayReason(response.data) : null;
      } else {
        setError(response.message || 'Failed to update delay reason');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchDelayReasons]);

  const deleteDelayReason = useCallback(async (id: number) => {
    try {
      setError(null);
      const response = await apiClient.deleteDelayReason(id);
      
      if (response.success) {
        await fetchDelayReasons();
        return true;
      } else {
        setError(response.message || 'Failed to delete delay reason');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchDelayReasons]);

  useEffect(() => {
    fetchDelayReasons();
  }, [fetchDelayReasons]);

  return {
    delayReasons,
    loading,
    error,
    pagination,
    refetch: fetchDelayReasons,
    createDelayReason,
    updateDelayReason,
    deleteDelayReason,
  };
}

