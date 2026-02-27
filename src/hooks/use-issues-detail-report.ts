import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { IssuesDetailReport, IssuesDetailReportFilters, IssuesDetailReportItem, Issue } from '@/types';

interface UseIssuesDetailReportReturn {
  issues: IssuesDetailReportItem[];
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
    description: data.description,
    created_at: data.created_at,
    updated_at: data.updated_at,
    updated_by: data.updated_by,
    updated_by_username: data.updated_by_username,
  };
};

// Helper function to normalize issues detail report item
const normalizeIssuesDetailReportItem = (data: any): IssuesDetailReportItem => {
  return {
    pi_id: data.pi_id,
    issue_id: data.issue_id,
    proj_id: data.proj_id,
    s_id: data.s_id,
    step_name: data.step_name,
    status: data.status ?? 0,
    description: data.description ?? null,
    remarks_1: data.remarks_1 ?? null,
    remarks_2: data.remarks_2 ?? null,
    remarks_3: data.remarks_3 ?? null,
    opened_at: data.opened_at ?? null,
    completed_at: data.completed_at ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at || null,
    updated_by: data.updated_by || null,
    updated_by_username: data.updated_by_username || null,
    issue: normalizeIssue(data.issue),
    project: data.project ? {
      proj_id: data.project.proj_id,
      proj_name: data.project.proj_name,
      ptype_id: data.project.ptype_id,
      dept_id: data.project.dept_id,
      sd_id: data.project.sd_id,
      fs_id: data.project.fs_id,
      start_date: data.project.start_date,
      completion_date: data.project.completion_date,
      tar_date: data.project.tar_date,
      status: data.project.status,
      created_at: data.project.created_at,
      project_type: data.project.project_type ? {
        id: data.project.project_type.ptype_id || data.project.project_type.id,
        name: data.project.project_type.ptype_name || data.project.project_type.name || '',
        created_at: data.project.project_type.created_at || '',
        updated_at: data.project.project_type.updated_at || '',
      } : undefined,
      department: data.project.department ? {
        dept_id: data.project.department.dept_id || data.project.department.id,
        name: data.project.department.name || data.project.department.dept_name || '',
        description: data.project.department.description,
        created_at: data.project.department.created_at || '',
        updated_at: data.project.department.updated_at || '',
      } : undefined,
    } : undefined,
  };
};

export function useIssuesDetailReport(filters: IssuesDetailReportFilters = {}): UseIssuesDetailReportReturn {
  const [issues, setIssues] = useState<IssuesDetailReportItem[]>([]);
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
      const response = await apiClient.getIssuesDetailReport(memoizedFilters);
      
      if (response.success && response.data) {
        const normalizedIssues = (response.data.issues || []).map(normalizeIssuesDetailReportItem);
        setIssues(normalizedIssues);
        setPagination(response.data.pagination || null);
      } else {
        setError(response.message || 'Failed to fetch issues detail report');
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
    issues,
    loading,
    error,
    pagination,
    refetch: fetchReport,
  };
}

