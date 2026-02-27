import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { ProjectType, ProjectTypeFilters } from '@/types';

interface UseProjectTypesReturn {
  projectTypes: ProjectType[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  refetch: () => Promise<void>;
  createProjectType: (projectTypeData: { ptype_name: string; department_id: number }) => Promise<ProjectType | null>;
  updateProjectType: (id: number, projectTypeData: { ptype_name?: string }) => Promise<ProjectType | null>;
  deleteProjectType: (id: number) => Promise<boolean>;
}

// Helper function to normalize API response to ProjectType
const normalizeProjectType = (data: any): ProjectType => {
  return {
    id: data.ptype_id || data.id,
    name: data.ptype_name || data.name,
    department_id: data.department_id,
    department_name: data.department_name,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
};

export function useProjectTypes(filters: ProjectTypeFilters = {}): UseProjectTypesReturn {
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchProjectTypes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getProjectTypes({ ...memoizedFilters, all: true });
      
      if (response.success && response.data) {
        const projectTypesData = Array.isArray(response.data) 
          ? response.data.map(normalizeProjectType)
          : (response.data as any).projectTypes?.map(normalizeProjectType) || [];
        setProjectTypes(projectTypesData);
        setPagination((response.data as any).pagination || null);
      } else {
        setError(response.message || 'Failed to fetch project types');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  const createProjectType = useCallback(async (projectTypeData: { ptype_name: string; department_id: number }) => {
    try {
      setError(null);
      const response = await apiClient.createProjectType(projectTypeData);
      
      if (response.success) {
        await fetchProjectTypes();
        return response.data ? normalizeProjectType(response.data) : null;
      } else {
        setError(response.message || 'Failed to create project type');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchProjectTypes]);

  const updateProjectType = useCallback(async (id: number, projectTypeData: { ptype_name?: string }) => {
    try {
      setError(null);
      const response = await apiClient.updateProjectType(id, projectTypeData);
      
      if (response.success) {
        await fetchProjectTypes();
        return response.data ? normalizeProjectType(response.data) : null;
      } else {
        setError(response.message || 'Failed to update project type');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchProjectTypes]);

  const deleteProjectType = useCallback(async (id: number) => {
    try {
      setError(null);
      const response = await apiClient.deleteProjectType(id);
      
      if (response.success) {
        await fetchProjectTypes();
        return true;
      } else {
        setError(response.message || 'Failed to delete project type');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchProjectTypes]);

  useEffect(() => {
    fetchProjectTypes();
  }, [fetchProjectTypes]);

  return {
    projectTypes,
    loading,
    error,
    pagination,
    refetch: fetchProjectTypes,
    createProjectType,
    updateProjectType,
    deleteProjectType,
  };
}

