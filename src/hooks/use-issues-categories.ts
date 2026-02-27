import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { IssueCategory, IssueCategoryFilters } from '@/types';

interface UseIssueCategoriesReturn {
  issueCategories: IssueCategory[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  refetch: () => Promise<void>;
  createIssueCategory: (issueCategoryData: { issue_c_name: string; description?: string }) => Promise<IssueCategory | null>;
  updateIssueCategory: (id: number, issueCategoryData: { issue_c_name?: string; description?: string }) => Promise<IssueCategory | null>;
  deleteIssueCategory: (id: number) => Promise<boolean>;
}

// Helper function to normalize API response to IssueCategory
const normalizeIssueCategory = (data: any): IssueCategory => {
  return {
    id: data.issue_c_id || data.id,
    issue_c_id: data.issue_c_id || data.id,
    name: data.issue_c_name || data.name,
    issue_c_name: data.issue_c_name || data.name,
    description: data.description ?? undefined,
    created_at: data.created_at,
    updated_at: data.updated_at,
    updated_by: data.updated_by,
    updated_by_username: data.updated_by_username,
  };
};

export function useIssueCategories(filters: IssueCategoryFilters = {}): UseIssueCategoriesReturn {
  const [issueCategories, setIssueCategories] = useState<IssueCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchIssueCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getIssueCategories({ ...memoizedFilters, all: true });
      
      if (response.success && response.data) {
        const categoriesData = Array.isArray(response.data) 
          ? response.data.map(normalizeIssueCategory)
          : (response.data as any).issueCategories?.map(normalizeIssueCategory) || [];
        setIssueCategories(categoriesData);
        setPagination((response.data as any).pagination || null);
      } else {
        setError(response.message || 'Failed to fetch issue categories');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  const createIssueCategory = useCallback(async (issueCategoryData: { issue_c_name: string; description?: string }) => {
    try {
      setError(null);
      const response = await apiClient.createIssueCategory(issueCategoryData);
      
      if (response.success) {
        await fetchIssueCategories();
        return response.data ? normalizeIssueCategory(response.data) : null;
      } else {
        setError(response.message || 'Failed to create issue category');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchIssueCategories]);

  const updateIssueCategory = useCallback(async (id: number, issueCategoryData: { issue_c_name?: string; description?: string }) => {
    try {
      setError(null);
      const response = await apiClient.updateIssueCategory(id, issueCategoryData);
      
      if (response.success) {
        await fetchIssueCategories();
        return response.data ? normalizeIssueCategory(response.data) : null;
      } else {
        setError(response.message || 'Failed to update issue category');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchIssueCategories]);

  const deleteIssueCategory = useCallback(async (id: number) => {
    try {
      setError(null);
      const response = await apiClient.deleteIssueCategory(id);
      
      if (response.success) {
        await fetchIssueCategories();
        return true;
      } else {
        setError(response.message || 'Failed to delete issue category');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchIssueCategories]);

  useEffect(() => {
    fetchIssueCategories();
  }, [fetchIssueCategories]);

  return {
    issueCategories,
    loading,
    error,
    pagination,
    refetch: fetchIssueCategories,
    createIssueCategory,
    updateIssueCategory,
    deleteIssueCategory,
  };
}

