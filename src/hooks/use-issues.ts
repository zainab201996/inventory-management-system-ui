import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { Issue, IssueFilters } from '@/types';

interface UseIssuesReturn {
  issues: Issue[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  refetch: () => Promise<void>;
  createIssue: (issueData: { issue_name: string; description?: string | null; issue_category_id?: number | null; department_id: number }) => Promise<Issue | null>;
  updateIssue: (id: number, issueData: { issue_name?: string; description?: string | null; issue_category_id?: number | null }) => Promise<Issue | null>;
  deleteIssue: (id: number) => Promise<boolean>;
}

// Helper function to normalize API response to Issue
const normalizeIssue = (data: any): Issue => {
  return {
    id: data.issue_id || data.id,
    name: data.issue_name || data.name,
    description: data.description ?? undefined,
    issue_category_id: data.issue_category_id ?? undefined,
    department_id: data.department_id ?? undefined,
    department_name: data.department_name ?? undefined,
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
  };
};

export function useIssues(filters: IssueFilters = {}): UseIssuesReturn {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getIssues({ ...memoizedFilters, all: true });
      
      if (response.success && response.data) {
        const issuesData = Array.isArray(response.data) 
          ? response.data.map(normalizeIssue)
          : (response.data as any).issues?.map(normalizeIssue) || [];
        setIssues(issuesData);
        setPagination((response.data as any).pagination || null);
      } else {
        setError(response.message || 'Failed to fetch issues');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  const createIssue = useCallback(async (issueData: { issue_name: string; description?: string | null; issue_category_id?: number | null; department_id: number }) => {
    try {
      setError(null);
      const response = await apiClient.createIssue(issueData);
      
      if (response.success) {
        await fetchIssues();
        return response.data ? normalizeIssue(response.data) : null;
      } else {
        setError(response.message || 'Failed to create issue');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchIssues]);

  const updateIssue = useCallback(async (id: number, issueData: { issue_name?: string; description?: string | null; issue_category_id?: number | null }) => {
    try {
      setError(null);
      const response = await apiClient.updateIssue(id, issueData);
      
      if (response.success) {
        await fetchIssues();
        return response.data ? normalizeIssue(response.data) : null;
      } else {
        setError(response.message || 'Failed to update issue');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchIssues]);

  const deleteIssue = useCallback(async (id: number) => {
    try {
      setError(null);
      const response = await apiClient.deleteIssue(id);
      
      if (response.success) {
        await fetchIssues();
        return true;
      } else {
        setError(response.message || 'Failed to delete issue');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchIssues]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  return {
    issues,
    loading,
    error,
    pagination,
    refetch: fetchIssues,
    createIssue,
    updateIssue,
    deleteIssue,
  };
}
