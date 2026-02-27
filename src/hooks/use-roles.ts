import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { Role, RoleFilters } from '@/types';

interface UseRolesReturn {
  roles: Role[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  refetch: () => Promise<void>;
  createRole: (roleData: { role_name: string }) => Promise<Role | null>;
  updateRole: (id: number, roleData: { role_name?: string }) => Promise<Role | null>;
  deleteRole: (id: number) => Promise<boolean>;
}

export function useRoles(filters: RoleFilters = {}): UseRolesReturn {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getRoles({ ...memoizedFilters, all: true });
      
      if (response.success && response.data) {
        const rolesData = Array.isArray(response.data) 
          ? response.data 
          : (response.data as any).roles || [];
        // Normalize API data: role_id -> id, role_name -> name
        const normalizedRoles = rolesData.map((role: any) => ({
          ...role,
          id: role.role_id || role.id,
          name: role.role_name || role.name,
        }));
        setRoles(normalizedRoles);
        setPagination((response.data as any).pagination || null);
      } else {
        setError(response.message || 'Failed to fetch roles');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  const createRole = useCallback(async (roleData: { role_name: string }) => {
    try {
      setError(null);
      const response = await apiClient.createRole(roleData);
      
      if (response.success) {
        await fetchRoles();
        return response.data ?? null;
      } else {
        setError(response.message || 'Failed to create role');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchRoles]);

  const updateRole = useCallback(async (id: number, roleData: { role_name?: string }) => {
    try {
      setError(null);
      const response = await apiClient.updateRole(id, roleData);
      
      if (response.success) {
        await fetchRoles();
        return response.data ?? null;
      } else {
        setError(response.message || 'Failed to update role');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchRoles]);

  const deleteRole = useCallback(async (id: number) => {
    try {
      setError(null);
      const response = await apiClient.deleteRole(id);
      
      if (response.success) {
        await fetchRoles();
        return true;
      } else {
        setError(response.message || 'Failed to delete role');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchRoles]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return {
    roles,
    loading,
    error,
    pagination,
    refetch: fetchRoles,
    createRole,
    updateRole,
    deleteRole,
  };
}

