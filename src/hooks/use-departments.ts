import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { Department, DepartmentFilters } from '@/types';

interface UseDepartmentsReturn {
  departments: Department[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  refetch: () => Promise<void>;
  createDepartment: (departmentData: { name: string; description?: string }) => Promise<Department | null>;
  updateDepartment: (id: number, departmentData: { name?: string; description?: string }) => Promise<Department | null>;
  deleteDepartment: (id: number) => Promise<boolean>;
}

export function useDepartments(filters: DepartmentFilters = {}): UseDepartmentsReturn {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getDepartments({ ...memoizedFilters, all: true });
      
      if (response.success && response.data) {
        // When all=true, API returns array directly: { success: true, data: [...] }
        // When paginated, API returns: { success: true, data: { departments: [...], pagination: {...} } }
        const departmentsData = Array.isArray(response.data) 
          ? response.data 
          : (response.data as any).departments || [];
        setDepartments(departmentsData);
        setPagination((response.data as any).pagination || null);
      } else {
        setError(response.message || 'Failed to fetch departments');
        setDepartments([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  const createDepartment = useCallback(async (departmentData: { name: string; description?: string }) => {
    try {
      setError(null);
      const response = await apiClient.createDepartment(departmentData);
      
      if (response.success) {
        await fetchDepartments();
        return response.data ?? null;
      } else {
        setError(response.message || 'Failed to create department');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchDepartments]);

  const updateDepartment = useCallback(async (id: number, departmentData: { name?: string; description?: string }) => {
    try {
      setError(null);
      const response = await apiClient.updateDepartment(id, departmentData);
      
      if (response.success) {
        await fetchDepartments();
        return response.data ?? null;
      } else {
        setError(response.message || 'Failed to update department');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchDepartments]);

  const deleteDepartment = useCallback(async (id: number) => {
    try {
      setError(null);
      const response = await apiClient.deleteDepartment(id);
      
      if (response.success) {
        await fetchDepartments();
        return true;
      } else {
        setError(response.message || 'Failed to delete department');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchDepartments]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  return {
    departments,
    loading,
    error,
    pagination,
    refetch: fetchDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  };
}

