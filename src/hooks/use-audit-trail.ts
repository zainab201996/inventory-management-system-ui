import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { AuditTrail, AuditTrailFilters } from '@/types';

interface UseAuditTrailReturn {
  auditTrails: AuditTrail[];
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

export function useAuditTrail(filters: AuditTrailFilters = {}): UseAuditTrailReturn {
  const [auditTrails, setAuditTrails] = useState<AuditTrail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchAuditTrails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getAuditTrail(memoizedFilters);
      
      if (response.success && response.data) {
        setAuditTrails(response.data.auditTrails || []);
        setPagination(response.data.pagination || null);
      } else {
        setError(response.message || 'Failed to fetch audit log');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  useEffect(() => {
    fetchAuditTrails();
  }, [fetchAuditTrails]);

  return {
    auditTrails,
    loading,
    error,
    pagination,
    refetch: fetchAuditTrails,
  };
}
