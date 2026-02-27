import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { FundingSource, FundingSourceFilters } from '@/types';

interface UseFundingSourcesReturn {
  fundingSources: FundingSource[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  refetch: () => Promise<void>;
  createFundingSource: (fundingSourceData: { fs_name: string; description?: string }) => Promise<FundingSource | null>;
  updateFundingSource: (id: number, fundingSourceData: { fs_name?: string; description?: string }) => Promise<FundingSource | null>;
  deleteFundingSource: (id: number) => Promise<boolean>;
}

// Helper function to normalize API response to FundingSource
const normalizeFundingSource = (data: any): FundingSource => {
  return {
    id: data.fs_id || data.id,
    name: data.fs_name || data.name,
    description: data.description,
    created_at: data.created_at,
    updated_at: data.updated_at,
    updated_by: data.updated_by,
    updated_by_username: data.updated_by_username,
  };
};

export function useFundingSources(filters: FundingSourceFilters = {}): UseFundingSourcesReturn {
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchFundingSources = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getFundingSources({ ...memoizedFilters, all: true });
      
      if (response.success && response.data) {
        const fundingSourcesData = Array.isArray(response.data) 
          ? response.data.map(normalizeFundingSource)
          : (response.data as any).fundingSources?.map(normalizeFundingSource) || [];
        setFundingSources(fundingSourcesData);
        setPagination((response.data as any).pagination || null);
      } else {
        setError(response.message || 'Failed to fetch funding sources');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  const createFundingSource = useCallback(async (fundingSourceData: { fs_name: string; description?: string }) => {
    try {
      setError(null);
      const response = await apiClient.createFundingSource(fundingSourceData);
      
      if (response.success) {
        await fetchFundingSources();
        return response.data ? normalizeFundingSource(response.data) : null;
      } else {
        setError(response.message || 'Failed to create funding source');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchFundingSources]);

  const updateFundingSource = useCallback(async (id: number, fundingSourceData: { fs_name?: string; description?: string }) => {
    try {
      setError(null);
      const response = await apiClient.updateFundingSource(id, fundingSourceData);
      
      if (response.success) {
        await fetchFundingSources();
        return response.data ? normalizeFundingSource(response.data) : null;
      } else {
        setError(response.message || 'Failed to update funding source');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchFundingSources]);

  const deleteFundingSource = useCallback(async (id: number) => {
    try {
      setError(null);
      const response = await apiClient.deleteFundingSource(id);
      
      if (response.success) {
        await fetchFundingSources();
        return true;
      } else {
        setError(response.message || 'Failed to delete funding source');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchFundingSources]);

  useEffect(() => {
    fetchFundingSources();
  }, [fetchFundingSources]);

  return {
    fundingSources,
    loading,
    error,
    pagination,
    refetch: fetchFundingSources,
    createFundingSource,
    updateFundingSource,
    deleteFundingSource,
  };
}

