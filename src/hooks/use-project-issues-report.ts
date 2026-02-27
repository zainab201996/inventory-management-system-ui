import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { ProjectWithIssues, ProjectIssuesReportFilters, Issue } from '@/types';

interface UseProjectIssuesReportReturn {
  projects: ProjectWithIssues[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  refetch: () => Promise<void>;
}

// Helper function to normalize issue object
const normalizeIssue = (data: any): Issue | undefined => {
  if (!data) return undefined;
  return {
    id: data.issue_id || data.id,
    name: data.issue_name || data.name,
    description: data.description ?? undefined,
    issue_category_id: data.issue_category_id ?? undefined,
    department_id: data.department_id ?? undefined,
    created_at: data.created_at,
    updated_at: data.updated_at,
    updated_by: data.updated_by,
    updated_by_username: data.updated_by_username,
    issue_category: data.issue_category ? {
      id: data.issue_category.issue_c_id || data.issue_category.id,
      issue_c_id: data.issue_category.issue_c_id || data.issue_category.id,
      name: data.issue_category.issue_c_name || data.issue_category.name,
      issue_c_name: data.issue_category.issue_c_name || data.issue_category.name,
      description: data.issue_category.description,
      created_at: data.issue_category.created_at,
      updated_at: data.issue_category.updated_at,
      updated_by: data.issue_category.updated_by,
      updated_by_username: data.issue_category.updated_by_username,
    } : undefined,
    department: data.department ? {
      dept_id: data.department.dept_id || data.department.id,
      name: data.department.name,
      description: data.department.description,
      created_at: data.department.created_at,
      updated_at: data.department.updated_at,
      updated_by: data.department.updated_by,
      updated_by_username: data.department.updated_by_username,
    } : undefined,
  };
};

// Helper function to normalize project issue report item
const normalizeProjectIssueReportItem = (data: any) => {
  return {
    pi_id: data.pi_id || data.id,
    issue_id: data.issue_id,
    proj_id: data.proj_id,
    s_id: data.s_id,
    step_name: data.step_name,
    status: data.status ?? 0,
    remarks_1: data.remarks_1 ?? null,
    remarks_2: data.remarks_2 ?? null,
    remarks_3: data.remarks_3 ?? null,
    opened_at: data.opened_at ?? null,
    completed_at: data.completed_at ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at || null,
    updated_by: data.updated_by,
    updated_by_username: data.updated_by_username,
    issue: normalizeIssue(data.issue),
  };
};

// Helper function to normalize project with issues
const normalizeProjectWithIssues = (data: any): ProjectWithIssues => {
  return {
    proj_id: data.proj_id,
    proj_name: data.proj_name,
    ptype_id: data.ptype_id,
    dept_id: data.dept_id,
    start_date: data.start_date,
    completion_date: data.completion_date,
    status: data.status,
    created_at: data.created_at,
    project_type: data.project_type ? {
      id: data.project_type.ptype_id || data.project_type.id,
      name: data.project_type.ptype_name || data.project_type.name || '',
      created_at: data.project_type.created_at || '',
      updated_at: data.project_type.updated_at || '',
    } : undefined,
    department: data.department ? {
      dept_id: data.department.dept_id || data.department.id,
      name: data.department.name || data.department.dept_name || '',
      description: data.department.description,
      created_at: data.department.created_at || '',
      updated_at: data.department.updated_at || '',
    } : undefined,
    issues: (data.issues || []).map(normalizeProjectIssueReportItem),
    issue_counts: data.issue_counts || {
      total: 0,
      open: 0,
      completed: 0,
    },
  };
};

export function useProjectIssuesReport(filters: ProjectIssuesReportFilters = {}): UseProjectIssuesReportReturn {
  const [projects, setProjects] = useState<ProjectWithIssues[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getProjectIssuesReport(memoizedFilters);
      
      if (response.success && response.data) {
        const normalizedProjects = (response.data.projects || []).map(normalizeProjectWithIssues);
        setProjects(normalizedProjects);
        setPagination(response.data.pagination || null);
      } else {
        setError(response.message || 'Failed to fetch project wise issues');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return {
    projects,
    loading,
    error,
    pagination,
    refetch: fetchReport,
  };
}
