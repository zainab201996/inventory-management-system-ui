import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { RoleDetail, RoleDetailFilters } from '@/types';

interface UseRoleDetailsReturn {
  roleDetails: RoleDetail[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  refetch: () => Promise<void>;
  createRoleDetail: (roleDetailData: { role_id: number; page_id: number; show?: boolean; create?: boolean; edit?: boolean; delete?: boolean }) => Promise<RoleDetail | null>;
  updateRoleDetail: (id: number, roleDetailData: { show?: boolean; create?: boolean; edit?: boolean; delete?: boolean }) => Promise<RoleDetail | null>;
  deleteRoleDetail: (id: number) => Promise<boolean>;
}

export function useRoleDetails(filters: RoleDetailFilters = {}): UseRoleDetailsReturn {
  const [roleDetails, setRoleDetails] = useState<RoleDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchRoleDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getRoleDetails(memoizedFilters);
      
      if (response.success && response.data) {
        const detailsData = Array.isArray(response.data) 
          ? response.data 
          : (response.data as any).details || [];
        setRoleDetails(detailsData);
        setPagination((response.data as any).pagination || null);
      } else {
        setError(response.message || 'Failed to fetch role details');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  const createRoleDetail = useCallback(async (roleDetailData: { role_id: number; page_id: number; show?: boolean; create?: boolean; edit?: boolean; delete?: boolean }) => {
    try {
      setError(null);
      const response = await apiClient.createRoleDetail(roleDetailData);
      
      if (response.success) {
        await fetchRoleDetails();
        return response.data ?? null;
      } else {
        setError(response.message || 'Failed to create role detail');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchRoleDetails]);

  const updateRoleDetail = useCallback(async (id: number, roleDetailData: { show?: boolean; create?: boolean; edit?: boolean; delete?: boolean }) => {
    try {
      setError(null);
      const response = await apiClient.updateRoleDetail(id, roleDetailData);
      
      if (response.success) {
        await fetchRoleDetails();
        return response.data ?? null;
      } else {
        setError(response.message || 'Failed to update role detail');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchRoleDetails]);

  const deleteRoleDetail = useCallback(async (id: number) => {
    try {
      setError(null);
      const response = await apiClient.deleteRoleDetail(id);
      
      if (response.success) {
        await fetchRoleDetails();
        return true;
      } else {
        setError(response.message || 'Failed to delete role detail');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchRoleDetails]);

  useEffect(() => {
    fetchRoleDetails();
  }, [fetchRoleDetails]);

  return {
    roleDetails,
    loading,
    error,
    pagination,
    refetch: fetchRoleDetails,
    createRoleDetail,
    updateRoleDetail,
    deleteRoleDetail,
  };
}
