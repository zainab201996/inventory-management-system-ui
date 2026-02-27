import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { BusinessPlanDetail, BusinessPlanDetailFilters } from '@/types';

interface UseBusinessPlanDetailsReturn {
  businessPlanDetails: BusinessPlanDetail[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  refetch: () => Promise<void>;
  createBusinessPlanDetail: (detailData: { proj_id: number; s_id: number; weightage?: number; t_days?: number; est_cost?: number; order?: number; status?: number }) => Promise<BusinessPlanDetail | null>;
  updateBusinessPlanDetail: (id: number, detailData: { proj_id?: number; s_id?: number; weightage?: number; t_days?: number; est_cost?: number; act_cost?: number | null; order?: number; started_at?: string | null; completed_at?: string | null; remarks_1?: string | null; remarks_2?: string | null }) => Promise<BusinessPlanDetail | null>;
  startBusinessPlanDetail: (id: number, started_at: string, remarks_1?: string | null) => Promise<BusinessPlanDetail | null>;
  completeBusinessPlanDetail: (id: number, completed_at: string, remarks_2?: string | null, act_cost?: number | null) => Promise<BusinessPlanDetail | null>;
  deleteBusinessPlanDetail: (id: number) => Promise<boolean>;
}

// Helper function to normalize API response to BusinessPlanDetail
const normalizeBusinessPlanDetail = (data: any): BusinessPlanDetail => {
  return {
    bpd_id: data.bpd_id || data.id, // Support both bpd_id (new) and id (legacy) for backward compatibility
    proj_id: data.proj_id,
    s_id: data.s_id,
    weightage: data.weightage || 0,
    t_days: data.t_days || 0,
    est_cost: data.est_cost || 0,
    act_cost: data.act_cost != null ? data.act_cost : null,
    order: data.order || 0,
    status: data.status !== undefined ? data.status : 0, // 0 = planned, 1 = started, 2 = completed
    remarks_1: data.remarks_1 || null,
    remarks_2: data.remarks_2 || null,
    started_at: data.started_at || null,
    completed_at: data.completed_at || null,
    due_date: data.due_date || null, // Calculated by backend based on prerequisites
    created_at: data.created_at,
    updated_at: data.updated_at,
    business_plan: data.business_plan ? {
      id: data.business_plan.proj_id || data.business_plan.id,
      ptype_id: data.business_plan.ptype_id,
      dept_id: data.business_plan.dept_id,
      department_name: data.business_plan.department_name || data.business_plan.department?.name,
      sd_id: typeof data.business_plan.sd_id === 'number' ? data.business_plan.sd_id : 0,
      sub_division_name: data.business_plan.sub_division_name || data.business_plan.sub_division?.name,
      fs_id: data.business_plan.fs_id !== undefined ? data.business_plan.fs_id : null,
      funding_source_name: data.business_plan.funding_source_name || data.business_plan.funding_source?.fs_name || data.business_plan.funding_source?.name,
      name: data.business_plan.proj_name || data.business_plan.name,
      start_date: data.business_plan.start_date || null,
      completion_date: data.business_plan.completion_date || null,
      tar_date: data.business_plan.tar_date || null,
      status: data.business_plan.status !== undefined ? data.business_plan.status : 0, // 0 = planned, 1 = started, 2 = completed
      created_at: data.business_plan.created_at || '',
      project_type: data.business_plan.project_type,
      department: data.business_plan.department,
      sub_division: data.business_plan.sub_division,
    } : undefined,
    step: data.step ? {
      id: data.step.s_id || data.step.id,
      name: data.step.s_name || data.step.name,
      created_at: data.step.created_at || '',
      updated_at: data.step.updated_at || '',
    } : undefined,
  };
};

export function useBusinessPlanDetails(filters: BusinessPlanDetailFilters = {}): UseBusinessPlanDetailsReturn {
  const [businessPlanDetails, setBusinessPlanDetails] = useState<BusinessPlanDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  // Memoize filters properly to avoid unnecessary re-renders
  const memoizedFilters = useMemo(() => {
    return {
      proj_id: filters.proj_id,
      page: filters.page,
      limit: filters.limit,
      sort_by: filters.sort_by,
      sort_order: filters.sort_order,
      all: filters.all
    };
  }, [filters.proj_id, filters.page, filters.limit, filters.sort_by, filters.sort_order, filters.all]);

  const fetchBusinessPlanDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Always include all: true when fetching for update progress page
      const response = await apiClient.getBusinessPlanDetails({ ...memoizedFilters, all: true });
      
      if (response.success && response.data) {
        const detailsData = Array.isArray(response.data) 
          ? response.data.map(normalizeBusinessPlanDetail)
          : (response.data as any).details?.map(normalizeBusinessPlanDetail) || [];
        setBusinessPlanDetails(detailsData);
        setPagination((response.data as any).pagination || null);
      } else {
        setError(response.message || 'Failed to fetch business plan details');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  const createBusinessPlanDetail = useCallback(async (detailData: { proj_id: number; s_id: number; weightage?: number; t_days?: number; est_cost?: number; order?: number; status?: number }) => {
    try {
      setError(null);
      const response = await apiClient.createBusinessPlanDetail(detailData);
      
      if (response.success) {
        await fetchBusinessPlanDetails();
        return response.data ? normalizeBusinessPlanDetail(response.data) : null;
      } else {
        setError(response.message || 'Failed to create business plan detail');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchBusinessPlanDetails]);

  const updateBusinessPlanDetail = useCallback(async (id: number, detailData: { proj_id?: number; s_id?: number; weightage?: number; t_days?: number; est_cost?: number; act_cost?: number | null; order?: number; started_at?: string | null; completed_at?: string | null; remarks_1?: string | null; remarks_2?: string | null }) => {
    try {
      setError(null);
      const response = await apiClient.updateBusinessPlanDetail(id, detailData);
      
      if (response.success) {
        await fetchBusinessPlanDetails();
        return response.data ? normalizeBusinessPlanDetail(response.data) : null;
      } else {
        setError(response.message || 'Failed to update business plan detail');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchBusinessPlanDetails]);

  const startBusinessPlanDetail = useCallback(async (id: number, started_at: string, remarks_1?: string | null) => {
    try {
      setError(null);
      const response = await apiClient.startBusinessPlanDetail(id, started_at, remarks_1);
      
      if (response.success) {
        await fetchBusinessPlanDetails();
        return response.data ? normalizeBusinessPlanDetail(response.data) : null;
      } else {
        const errorMsg = response.message || 'Failed to start business plan detail';
        setError(errorMsg);
        // Throw so callers can catch with the exact server message
        throw new Error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      throw err;
    }
  }, [fetchBusinessPlanDetails]);

  const completeBusinessPlanDetail = useCallback(async (id: number, completed_at: string, remarks_2?: string | null, act_cost?: number | null) => {
    try {
      setError(null);
      const response = await apiClient.completeBusinessPlanDetail(id, completed_at, remarks_2, act_cost);
      
      if (response.success) {
        await fetchBusinessPlanDetails();
        return response.data ? normalizeBusinessPlanDetail(response.data) : null;
      } else {
        const errorMsg = response.message || 'Failed to complete business plan detail';
        setError(errorMsg);
        // Throw so callers can catch with the exact server message
        throw new Error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      throw err;
    }
  }, [fetchBusinessPlanDetails]);

  const deleteBusinessPlanDetail = useCallback(async (id: number) => {
    try {
      setError(null);
      const response = await apiClient.deleteBusinessPlanDetail(id);
      
      if (response.success) {
        await fetchBusinessPlanDetails();
        return true;
      } else {
        setError(response.message || 'Failed to delete business plan detail');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchBusinessPlanDetails]);

  useEffect(() => {
    fetchBusinessPlanDetails();
  }, [fetchBusinessPlanDetails]);

  return {
    businessPlanDetails,
    loading,
    error,
    pagination,
    refetch: fetchBusinessPlanDetails,
    createBusinessPlanDetail,
    updateBusinessPlanDetail,
    startBusinessPlanDetail,
    completeBusinessPlanDetail,
    deleteBusinessPlanDetail,
  };
}
