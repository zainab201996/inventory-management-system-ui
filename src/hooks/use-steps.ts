import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { Step, StepFilters } from '@/types';

interface UseStepsReturn {
  steps: Step[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  refetch: () => Promise<void>;
  createStep: (stepData: { s_name: string; department_id: number }) => Promise<Step | null>;
  updateStep: (id: number, stepData: { s_name?: string }) => Promise<Step | null>;
  deleteStep: (id: number) => Promise<boolean>;
}

// Helper function to normalize API response to Step
const normalizeStep = (data: any): Step => {
  return {
    id: data.s_id || data.id,
    name: data.s_name || data.name,
    department_id: data.department_id,
    department_name: data.department_name,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
};

export function useSteps(filters: StepFilters = {}): UseStepsReturn {
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchSteps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getSteps({ ...memoizedFilters, all: true });
      
      if (response.success && response.data) {
        const stepsData = Array.isArray(response.data) 
          ? response.data.map(normalizeStep)
          : (response.data as any).steps?.map(normalizeStep) || [];
        setSteps(stepsData);
        setPagination((response.data as any).pagination || null);
      } else {
        setError(response.message || 'Failed to fetch steps');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  const createStep = useCallback(async (stepData: { s_name: string; department_id: number }) => {
    try {
      setError(null);
      const response = await apiClient.createStep(stepData);
      
      if (response.success) {
        await fetchSteps();
        return response.data ? normalizeStep(response.data) : null;
      } else {
        setError(response.message || 'Failed to create step');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchSteps]);

  const updateStep = useCallback(async (id: number, stepData: { s_name?: string }) => {
    try {
      setError(null);
      const response = await apiClient.updateStep(id, stepData);
      
      if (response.success) {
        await fetchSteps();
        return response.data ? normalizeStep(response.data) : null;
      } else {
        setError(response.message || 'Failed to update step');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchSteps]);

  const deleteStep = useCallback(async (id: number) => {
    try {
      setError(null);
      const response = await apiClient.deleteStep(id);
      
      if (response.success) {
        await fetchSteps();
        return true;
      } else {
        setError(response.message || 'Failed to delete step');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchSteps]);

  useEffect(() => {
    fetchSteps();
  }, [fetchSteps]);

  return {
    steps,
    loading,
    error,
    pagination,
    refetch: fetchSteps,
    createStep,
    updateStep,
    deleteStep,
  };
}

