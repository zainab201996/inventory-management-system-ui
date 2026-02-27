import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { BusinessPlan, BusinessPlanFilters } from '@/types';

interface UseBusinessPlansReturn {
  businessPlans: BusinessPlan[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  refetch: () => Promise<void>;
  createBusinessPlan: (businessPlanData: { ptype_id: number; dept_id?: number; sd_id: number; fs_id?: number | null; proj_name: string; tar_date: string; start_date?: string | null; completion_date?: string | null }) => Promise<BusinessPlan | null>;
  updateBusinessPlan: (id: number, businessPlanData: { ptype_id?: number; dept_id?: number; sd_id?: number; fs_id?: number | null; proj_name?: string; tar_date?: string | null; start_date?: string | null; completion_date?: string | null }) => Promise<BusinessPlan | null>;
  startBusinessPlan: (id: number, start_date: string) => Promise<BusinessPlan | null>;
  completeBusinessPlan: (id: number) => Promise<BusinessPlan | null>;
  cancelBusinessPlan: (id: number, cancellation_date: string, cancellation_reason: string) => Promise<BusinessPlan | null>;
  deleteBusinessPlan: (id: number) => Promise<boolean>;
}

// Helper function to normalize API response to BusinessPlan
const normalizeBusinessPlan = (data: any): BusinessPlan => {
  return {
    id: data.proj_id || data.id,
    ptype_id: data.ptype_id,
    dept_id: data.dept_id,
    department_name: data.department_name || data.department?.name,
    sd_id: typeof data.sd_id === 'number' ? data.sd_id : 0,
    sub_division_name: data.sub_division_name || data.sub_division?.name,
    fs_id: data.fs_id !== undefined ? data.fs_id : null,
    funding_source_name: data.funding_source_name || data.funding_source?.fs_name || data.funding_source?.name,
    name: data.proj_name || data.name,
    start_date: data.start_date || null,
    completion_date: data.completion_date || null,
    est_completion_date: data.est_completion_date !== undefined ? data.est_completion_date : null,
    total_days: data.total_days !== undefined ? data.total_days : null,
    new_est_completion_date: data.new_est_completion_date !== undefined ? data.new_est_completion_date : null,
    tar_date: data.tar_date || null,
    status: data.status !== undefined ? data.status : 0, // 0 = planned, 1 = started, 2 = completed, 3 = cancelled
    cancellation_date: data.cancellation_date !== undefined ? data.cancellation_date : null,
    cancellation_reason: data.cancellation_reason !== undefined ? data.cancellation_reason : null,
    created_at: data.created_at,
    project_type: data.project_type ? {
      id: data.project_type.ptype_id || data.project_type.id,
      name: data.project_type.ptype_name || data.project_type.name,
      created_at: data.project_type.created_at || '',
      updated_at: data.project_type.updated_at || '',
    } : undefined,
    department: data.department ? {
      dept_id: data.department.dept_id,
      name: data.department.name,
      description: data.department.description,
      created_at: data.department.created_at || '',
      updated_at: data.department.updated_at || '',
    } : undefined,
    sub_division: data.sub_division ? {
      id: data.sub_division.id,
      division_id: data.sub_division.division_id,
      name: data.sub_division.name,
      description: data.sub_division.description,
      updated_by: data.sub_division.updated_by,
      updated_by_username: data.sub_division.updated_by_username,
      created_at: data.sub_division.created_at,
      updated_at: data.sub_division.updated_at,
    } : undefined,
  };
};

export function useBusinessPlans(filters: BusinessPlanFilters = {}): UseBusinessPlansReturn {
  const [businessPlans, setBusinessPlans] = useState<BusinessPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchBusinessPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getBusinessPlans({ ...memoizedFilters, all: true });
      
      if (response.success && response.data) {
        const businessPlansData = Array.isArray(response.data) 
          ? response.data.map(normalizeBusinessPlan)
          : (response.data as any).businessPlans?.map(normalizeBusinessPlan) || [];
        setBusinessPlans(businessPlansData);
        setPagination((response.data as any).pagination || null);
      } else {
        setError(response.message || 'Failed to fetch business plans');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  const createBusinessPlan = useCallback(async (businessPlanData: { ptype_id: number; dept_id?: number; sd_id: number; fs_id?: number | null; proj_name: string; tar_date: string; start_date?: string | null; completion_date?: string | null }) => {
    try {
      setError(null);
      const response = await apiClient.createBusinessPlan(businessPlanData);
      
      if (response.success) {
        await fetchBusinessPlans();
        return response.data ? normalizeBusinessPlan(response.data) : null;
      } else {
        setError(response.message || 'Failed to create business plan');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchBusinessPlans]);

  const updateBusinessPlan = useCallback(async (id: number, businessPlanData: { ptype_id?: number; dept_id?: number; sd_id?: number; fs_id?: number | null; proj_name?: string; tar_date?: string | null; start_date?: string | null; completion_date?: string | null }) => {
    try {
      setError(null);
      const response = await apiClient.updateBusinessPlan(id, businessPlanData);
      
      if (response.success) {
        await fetchBusinessPlans();
        return response.data ? normalizeBusinessPlan(response.data) : null;
      } else {
        setError(response.message || 'Failed to update business plan');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchBusinessPlans]);

  const startBusinessPlan = useCallback(async (id: number, start_date: string) => {
    try {
      setError(null);
      const response = await apiClient.startBusinessPlan(id, start_date);
      
      if (response.success) {
        await fetchBusinessPlans();
        return response.data ? normalizeBusinessPlan(response.data) : null;
      } else {
        setError(response.message || 'Failed to start business plan');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchBusinessPlans]);

  const completeBusinessPlan = useCallback(async (id: number) => {
    try {
      setError(null);
      const response = await apiClient.completeBusinessPlan(id);
      
      if (response.success) {
        await fetchBusinessPlans();
        return response.data ? normalizeBusinessPlan(response.data) : null;
      } else {
        // Return the error message so the caller can handle it
        const errorMessage = response.message || 'Failed to complete business plan';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err; // Re-throw so caller can handle it
    }
  }, [fetchBusinessPlans]);

  const cancelBusinessPlan = useCallback(async (id: number, cancellation_date: string, cancellation_reason: string) => {
    try {
      setError(null);
      const response = await apiClient.cancelBusinessPlan(id, cancellation_date, cancellation_reason);
      
      if (response.success) {
        await fetchBusinessPlans();
        return response.data ? normalizeBusinessPlan(response.data) : null;
      } else {
        setError(response.message || 'Failed to cancel business plan');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchBusinessPlans]);

  const deleteBusinessPlan = useCallback(async (id: number) => {
    try {
      setError(null);
      const response = await apiClient.deleteBusinessPlan(id);
      
      if (response.success) {
        await fetchBusinessPlans();
        return true;
      } else {
        setError(response.message || 'Failed to delete business plan');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchBusinessPlans]);

  useEffect(() => {
    fetchBusinessPlans();
  }, [fetchBusinessPlans]);

  return {
    businessPlans,
    loading,
    error,
    pagination,
    refetch: fetchBusinessPlans,
    createBusinessPlan,
    updateBusinessPlan,
    startBusinessPlan,
    completeBusinessPlan,
    cancelBusinessPlan,
    deleteBusinessPlan,
  };
}

