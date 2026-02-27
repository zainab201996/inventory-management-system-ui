import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { UsersReportUser, UsersReportFilters, UsersReportDepartmentStatistic } from '@/types';

interface UseUsersReportReturn {
  users: UsersReportUser[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  departmentStatistics: UsersReportDepartmentStatistic[];
  usersWithAllDepartmentsCount: number;
  refetch: () => Promise<void>;
}

export function useUsersReport(filters: UsersReportFilters = {}): UseUsersReportReturn {
  const [users, setUsers] = useState<UsersReportUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);
  const [departmentStatistics, setDepartmentStatistics] = useState<UsersReportDepartmentStatistic[]>([]);
  const [usersWithAllDepartmentsCount, setUsersWithAllDepartmentsCount] = useState<number>(0);

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getUsersReport(memoizedFilters);
      
      if (response.success && response.data) {
        setUsers(response.data.users || []);
        setPagination(response.data.pagination || null);
        setDepartmentStatistics(response.data.department_statistics || []);
        setUsersWithAllDepartmentsCount(response.data.users_with_all_departments_count || 0);
      } else {
        setError(response.message || 'Failed to fetch users report');
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
    users,
    loading,
    error,
    pagination,
    departmentStatistics,
    usersWithAllDepartmentsCount,
    refetch: fetchReport,
  };
}
