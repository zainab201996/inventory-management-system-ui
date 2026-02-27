import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { ProjectIssue, ProjectIssueFilters, CreateProjectIssueData, UpdateProjectIssueData } from '@/types';

interface UseProjectIssuesReturn {
  projectIssues: ProjectIssue[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  refetch: () => Promise<void>;
  createProjectIssue: (projectIssueData: CreateProjectIssueData) => Promise<ProjectIssue | null>;
  createProjectIssueAction: (projectIssueData: CreateProjectIssueData) => Promise<ProjectIssue | null>;
  updateProjectIssue: (id: number, projectIssueData: UpdateProjectIssueData) => Promise<ProjectIssue | null>;
  openProjectIssue: (id: number, remarks_1?: string | null) => Promise<ProjectIssue | null>;
  completeProjectIssue: (id: number, remarks_3?: string | null) => Promise<ProjectIssue | null>;
  deleteProjectIssue: (id: number) => Promise<boolean>;
}

// Helper function to normalize API response to ProjectIssue
const normalizeProjectIssue = (data: any): ProjectIssue => {
  // Normalize issue object if present
  const issue = data.issue ? {
    id: data.issue.issue_id || data.issue.id,
    name: data.issue.issue_name || data.issue.name,
    created_at: data.issue.created_at,
    updated_at: data.issue.updated_at,
    updated_by: data.issue.updated_by,
    updated_by_username: data.issue.updated_by_username,
  } : undefined;

  // Normalize business_plan object if present
  const business_plan = data.business_plan ? {
    id: data.business_plan.proj_id || data.business_plan.id,
    ptype_id: data.business_plan.ptype_id,
    dept_id: data.business_plan.dept_id,
    sd_id: typeof data.business_plan.sd_id === 'number' ? data.business_plan.sd_id : 0,
    fs_id: data.business_plan.fs_id !== undefined ? data.business_plan.fs_id : null,
      name: data.business_plan.proj_name || data.business_plan.name,
      start_date: data.business_plan.start_date,
      completion_date: data.business_plan.completion_date,
      tar_date: data.business_plan.tar_date || null,
      status: data.business_plan.status,
    created_at: data.business_plan.created_at,
    project_type: data.business_plan.project_type,
    department: data.business_plan.department,
  } : undefined;

  return {
    pi_id: data.pi_id || data.id,
    issue_id: data.issue_id,
    proj_id: data.proj_id,
    s_id: data.s_id,
    step_name: data.step_name,
    status: data.status ?? 0,
    remarks_1: data.remarks_1 ?? null,
    remarks_3: data.remarks_3 ?? null,
    opened_at: data.opened_at ?? null,
    completed_at: data.completed_at ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,
    updated_by: data.updated_by,
    updated_by_username: data.updated_by_username,
    issue,
    business_plan,
  };
};

export function useProjectIssues(filters: ProjectIssueFilters = {}): UseProjectIssuesReturn {
  const [projectIssues, setProjectIssues] = useState<ProjectIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchProjectIssues = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getProjectIssues(memoizedFilters);
      
      if (response.success && response.data) {
        const issuesData = Array.isArray(response.data) 
          ? response.data.map(normalizeProjectIssue)
          : (response.data as any).projectIssues?.map(normalizeProjectIssue) || [];
        setProjectIssues(issuesData);
        setPagination((response.data as any).pagination || null);
      } else {
        setError(response.message || 'Failed to fetch project issues');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  const createProjectIssue = useCallback(async (projectIssueData: CreateProjectIssueData) => {
    try {
      setError(null);
      const response = await apiClient.createProjectIssue(projectIssueData);
      
      if (response.success) {
        await fetchProjectIssues();
        return response.data ? normalizeProjectIssue(response.data) : null;
      } else {
        setError(response.message || 'Failed to create project issue');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchProjectIssues]);

  const createProjectIssueAction = useCallback(async (projectIssueData: CreateProjectIssueData) => {
    try {
      setError(null);
      const response = await apiClient.createProjectIssueAction(projectIssueData);
      
      if (response.success) {
        await fetchProjectIssues();
        return response.data ? normalizeProjectIssue(response.data) : null;
      } else {
        setError(response.message || 'Failed to open project issue');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchProjectIssues]);

  const updateProjectIssue = useCallback(async (id: number, projectIssueData: UpdateProjectIssueData) => {
    try {
      setError(null);
      const response = await apiClient.updateProjectIssue(id, projectIssueData);
      
      if (response.success) {
        await fetchProjectIssues();
        return response.data ? normalizeProjectIssue(response.data) : null;
      } else {
        setError(response.message || 'Failed to update project issue');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchProjectIssues]);

  const openProjectIssue = useCallback(async (id: number, remarks_1?: string | null) => {
    try {
      setError(null);
      const response = await apiClient.openProjectIssue(id, remarks_1);
      
      if (response.success) {
        await fetchProjectIssues();
        return response.data ? normalizeProjectIssue(response.data) : null;
      } else {
        setError(response.message || 'Failed to open project issue');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchProjectIssues]);

  const completeProjectIssue = useCallback(async (id: number, remarks_3?: string | null) => {
    try {
      setError(null);
      const response = await apiClient.completeProjectIssue(id, remarks_3);
      
      if (response.success) {
        await fetchProjectIssues();
        return response.data ? normalizeProjectIssue(response.data) : null;
      } else {
        setError(response.message || 'Failed to complete project issue');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchProjectIssues]);

  const deleteProjectIssue = useCallback(async (id: number) => {
    try {
      setError(null);
      const response = await apiClient.deleteProjectIssue(id);
      
      if (response.success) {
        await fetchProjectIssues();
        return true;
      } else {
        setError(response.message || 'Failed to delete project issue');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchProjectIssues]);

  useEffect(() => {
    fetchProjectIssues();
  }, [fetchProjectIssues]);

  return {
    projectIssues,
    loading,
    error,
    pagination,
    refetch: fetchProjectIssues,
    createProjectIssue,
    createProjectIssueAction,
    updateProjectIssue,
    openProjectIssue,
    completeProjectIssue,
    deleteProjectIssue,
  };
}
