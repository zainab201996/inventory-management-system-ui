import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { Page, PageFilters } from '@/types';

interface UsePagesReturn {
  pages: Page[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  refetch: () => Promise<void>;
  createPage: (pageData: { page_name: string }) => Promise<Page | null>;
  updatePage: (id: number, pageData: { page_name?: string }) => Promise<Page | null>;
  deletePage: (id: number) => Promise<boolean>;
}

export function usePages(filters: PageFilters = {}): UsePagesReturn {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchPages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getPages({ ...memoizedFilters, all: true });
      
      if (response.success && response.data) {
        const pagesData = Array.isArray(response.data) 
          ? response.data 
          : (response.data as any).pages || [];
        setPages(pagesData);
        setPagination((response.data as any).pagination || null);
      } else {
        setError(response.message || 'Failed to fetch pages');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  const createPage = useCallback(async (pageData: { page_name: string }) => {
    try {
      setError(null);
      const response = await apiClient.createPage(pageData);
      
      if (response.success) {
        await fetchPages();
        return response.data ?? null;
      } else {
        setError(response.message || 'Failed to create page');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchPages]);

  const updatePage = useCallback(async (id: number, pageData: { page_name?: string }) => {
    try {
      setError(null);
      const response = await apiClient.updatePage(id, pageData);
      
      if (response.success) {
        await fetchPages();
        return response.data ?? null;
      } else {
        setError(response.message || 'Failed to update page');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchPages]);

  const deletePage = useCallback(async (id: number) => {
    try {
      setError(null);
      const response = await apiClient.deletePage(id);
      
      if (response.success) {
        await fetchPages();
        return true;
      } else {
        setError(response.message || 'Failed to delete page');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchPages]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  return {
    pages,
    loading,
    error,
    pagination,
    refetch: fetchPages,
    createPage,
    updatePage,
    deletePage,
  };
}
