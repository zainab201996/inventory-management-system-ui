import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { BPDDelay, BPDDelayFilters, CreateBPDDelayData, UpdateBPDDelayData } from '@/types';

interface UseBPDDelaysReturn {
  bpdDelays: BPDDelay[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  refetch: () => Promise<void>;
  createBPDDelay: (delayData: CreateBPDDelayData) => Promise<BPDDelay | null>;
  updateBPDDelay: (id: number, delayData: UpdateBPDDelayData) => Promise<BPDDelay | null>;
  deleteBPDDelay: (id: number) => Promise<boolean>;
}

// Helper function to normalize API response to BPDDelay
const normalizeBPDDelay = (data: any): BPDDelay => {
  return {
    bpdd_id: data.bpdd_id || data.id,
    bpd_id: data.bpd_id,
    delay_id: data.delay_id,
    remarks: data.remarks || null,
    created_at: data.created_at,
    created_by: data.created_by,
    created_by_username: data.created_by_username,
    business_plan_detail: data.business_plan_detail,
    delay_reason: data.delay_reason ? {
      id: data.delay_reason.d_id || data.delay_reason.id,
      name: data.delay_reason.d_name || data.delay_reason.name,
      created_at: data.delay_reason.created_at || '',
      updated_at: data.delay_reason.updated_at || '',
      updated_by: data.delay_reason.updated_by,
      updated_by_username: data.delay_reason.updated_by_username,
    } : undefined,
  };
};

export function useBPDDelays(filters: BPDDelayFilters = {}): UseBPDDelaysReturn {
  const [bpdDelays, setBpdDelays] = useState<BPDDelay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchBPDDelays = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getBPDDelays(memoizedFilters);
      
      if (response.success && response.data) {
        const delaysData = Array.isArray(response.data) 
          ? response.data.map(normalizeBPDDelay)
          : (response.data as any).delays?.map(normalizeBPDDelay) || [];
        setBpdDelays(delaysData);
        setPagination((response.data as any).pagination || null);
      } else {
        setError(response.message || 'Failed to fetch BPD delays');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  const createBPDDelay = useCallback(async (delayData: CreateBPDDelayData) => {
    try {
      setError(null);
      const response = await apiClient.createBPDDelay(delayData);
      
      if (response.success) {
        await fetchBPDDelays();
        return response.data ? normalizeBPDDelay(response.data) : null;
      } else {
        setError(response.message || 'Failed to create BPD delay');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchBPDDelays]);

  const updateBPDDelay = useCallback(async (id: number, delayData: UpdateBPDDelayData) => {
    try {
      setError(null);
      const response = await apiClient.updateBPDDelay(id, delayData);
      
      if (response.success) {
        await fetchBPDDelays();
        return response.data ? normalizeBPDDelay(response.data) : null;
      } else {
        setError(response.message || 'Failed to update BPD delay');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchBPDDelays]);

  const deleteBPDDelay = useCallback(async (id: number) => {
    try {
      setError(null);
      const response = await apiClient.deleteBPDDelay(id);
      
      if (response.success) {
        await fetchBPDDelays();
        return true;
      } else {
        setError(response.message || 'Failed to delete BPD delay');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchBPDDelays]);

  useEffect(() => {
    fetchBPDDelays();
  }, [fetchBPDDelays]);

  return {
    bpdDelays,
    loading,
    error,
    pagination,
    refetch: fetchBPDDelays,
    createBPDDelay,
    updateBPDDelay,
    deleteBPDDelay,
  };
}
