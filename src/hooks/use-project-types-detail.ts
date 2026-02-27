import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { getUserFriendlyApiErrorMessage } from '@/lib/utils';
import { ProjectTypeDetail, ProjectTypeDetailFilters } from '@/types';

interface UseProjectTypeDetailsReturn {
  projectTypeDetails: ProjectTypeDetail[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  refetch: () => Promise<void>;
  createProjectTypeDetail: (projectTypeDetailData: { ptype_id: number; s_id: number; weightage?: number; t_days?: number; est_cost?: number; order?: number }) => Promise<ProjectTypeDetail | null>;
  updateProjectTypeDetail: (id: number, projectTypeDetailData: { ptype_id?: number; s_id?: number; weightage?: number; t_days?: number; est_cost?: number; order?: number }) => Promise<ProjectTypeDetail | null>;
  deleteProjectTypeDetail: (id: number) => Promise<boolean>;
}

// Helper function to normalize API response to ProjectTypeDetail
const normalizeProjectTypeDetail = (data: any): ProjectTypeDetail => {
  return {
    id: data.id,
    ptype_id: data.ptype_id,
    s_id: data.s_id,
    weightage: data.weightage || 0,
    t_days: data.t_days || 0,
    est_cost: data.est_cost || 0,
    order: data.order || 0,
    created_at: data.created_at,
    updated_at: data.updated_at,
    project_type: data.project_type ? {
      id: data.project_type.ptype_id || data.project_type.id,
      name: data.project_type.ptype_name || data.project_type.name,
      created_at: data.project_type.created_at || '',
      updated_at: data.project_type.updated_at || '',
    } : undefined,
    step: data.step ? {
      id: data.step.s_id || data.step.id,
      name: data.step.s_name || data.step.name,
      created_at: data.step.created_at || '',
      updated_at: data.step.updated_at || '',
    } : undefined,
  };
};

export function useProjectTypeDetails(filters: ProjectTypeDetailFilters = {}): UseProjectTypeDetailsReturn {
  const [projectTypeDetails, setProjectTypeDetails] = useState<ProjectTypeDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchProjectTypeDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getProjectTypeDetails({ ...memoizedFilters, all: true });
      
      if (response.success && response.data) {
        const detailsData = Array.isArray(response.data) 
          ? response.data.map(normalizeProjectTypeDetail)
          : (response.data as any).details?.map(normalizeProjectTypeDetail) || [];
        setProjectTypeDetails(detailsData);
        setPagination((response.data as any).pagination || null);
      } else {
        setError(response.message || 'Failed to fetch project type details');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  const createProjectTypeDetail = useCallback(async (projectTypeDetailData: { ptype_id: number; s_id: number; weightage?: number; t_days?: number; est_cost?: number; order?: number }) => {
    try {
      setError(null);
      const response = await apiClient.createProjectTypeDetail(projectTypeDetailData);
      
      if (response.success) {
        await fetchProjectTypeDetails();
        return response.data ? normalizeProjectTypeDetail(response.data) : null;
      } else {
        const msg = response.message || 'Failed to create project type detail';
        setError(getUserFriendlyApiErrorMessage(msg));
        throw new Error(msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(getUserFriendlyApiErrorMessage(msg));
      throw err instanceof Error ? err : new Error(msg);
    }
  }, [fetchProjectTypeDetails]);

  const updateProjectTypeDetail = useCallback(async (id: number, projectTypeDetailData: { ptype_id?: number; s_id?: number; weightage?: number; t_days?: number; est_cost?: number; order?: number }) => {
    try {
      setError(null);
      const response = await apiClient.updateProjectTypeDetail(id, projectTypeDetailData);
      
      if (response.success) {
        await fetchProjectTypeDetails();
        return response.data ? normalizeProjectTypeDetail(response.data) : null;
      } else {
        const msg = response.message || 'Failed to update project type detail';
        setError(getUserFriendlyApiErrorMessage(msg));
        throw new Error(msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(getUserFriendlyApiErrorMessage(msg));
      throw err instanceof Error ? err : new Error(msg);
    }
  }, [fetchProjectTypeDetails]);

  const deleteProjectTypeDetail = useCallback(async (id: number) => {
    try {
      setError(null);
      const response = await apiClient.deleteProjectTypeDetail(id);
      
      if (response.success) {
        await fetchProjectTypeDetails();
        return true;
      } else {
        setError(getUserFriendlyApiErrorMessage(response.message || 'Failed to delete project type detail'));
        return false;
      }
    } catch (err) {
      setError(getUserFriendlyApiErrorMessage(err instanceof Error ? err.message : 'An error occurred'));
      return false;
    }
  }, [fetchProjectTypeDetails]);

  useEffect(() => {
    fetchProjectTypeDetails();
  }, [fetchProjectTypeDetails]);

  return {
    projectTypeDetails,
    loading,
    error,
    pagination,
    refetch: fetchProjectTypeDetails,
    createProjectTypeDetail,
    updateProjectTypeDetail,
    deleteProjectTypeDetail,
  };
}

