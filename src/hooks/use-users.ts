import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { User, UserFilters, CreateUserData, UpdateUserData } from '@/types';

interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  refetch: () => Promise<void>;
  createUser: (userData: CreateUserData) => Promise<User | null>;
  updateUser: (id: number, userData: UpdateUserData) => Promise<User | null>;
  deleteUser: (id: number) => Promise<boolean>;
}

export function useUsers(filters: UserFilters = {}): UseUsersReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getUsers(memoizedFilters);
      
      if (response.success && response.data) {
        setUsers(response.data.users || []);
        setPagination(response.data.pagination || null);
      } else {
        setError(response.message || 'Failed to fetch users');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  const createUser = useCallback(async (userData: CreateUserData) => {
    try {
      setError(null);
      const response = await apiClient.createUser(userData);
      
      if (response.success) {
        await fetchUsers();
        return response.data ?? null;
      } else {
        setError(response.message || 'Failed to create user');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchUsers]);

  const updateUser = useCallback(async (id: number, userData: UpdateUserData) => {
    try {
      setError(null);
      const response = await apiClient.updateUser(id, userData);
      
      if (response.success) {
        await fetchUsers();
        return response.data ?? null;
      } else {
        setError(response.message || 'Failed to update user');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchUsers]);

  const deleteUser = useCallback(async (id: number) => {
    try {
      setError(null);
      const response = await apiClient.deleteUser(id);
      
      if (response.success) {
        await fetchUsers();
        return true;
      } else {
        setError(response.message || 'Failed to delete user');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    pagination,
    refetch: fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  };
}

