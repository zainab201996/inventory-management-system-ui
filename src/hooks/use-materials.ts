import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { Material, MaterialFilters } from '@/types';

interface UseMaterialsReturn {
  materials: Material[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  refetch: () => Promise<void>;
  createMaterial: (materialData: { m_name: string; description?: string }) => Promise<Material | null>;
  updateMaterial: (id: number, materialData: { m_name?: string; description?: string }) => Promise<Material | null>;
  deleteMaterial: (id: number) => Promise<boolean>;
}

const normalizeMaterial = (data: any): Material => {
  return {
    id: data.m_id || data.id,
    name: data.m_name || data.name,
    description: data.description,
    created_at: data.created_at,
    updated_at: data.updated_at,
    updated_by: data.updated_by,
    updated_by_username: data.updated_by_username,
  };
};

export function useMaterials(filters: MaterialFilters = {}): UseMaterialsReturn {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchMaterials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getMaterials({ ...memoizedFilters, all: true });

      if (response.success && response.data) {
        const materialsData = Array.isArray(response.data)
          ? response.data.map(normalizeMaterial)
          : (response.data as any).materials?.map(normalizeMaterial) || [];
        setMaterials(materialsData);
        setPagination((response.data as any).pagination || null);
      } else {
        setError(response.message || 'Failed to fetch materials');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  const createMaterial = useCallback(async (materialData: { m_name: string; description?: string }) => {
    try {
      setError(null);
      const response = await apiClient.createMaterial(materialData);

      if (response.success) {
        await fetchMaterials();
        return response.data ? normalizeMaterial(response.data) : null;
      } else {
        setError(response.message || 'Failed to create material');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchMaterials]);

  const updateMaterial = useCallback(async (id: number, materialData: { m_name?: string; description?: string }) => {
    try {
      setError(null);
      const response = await apiClient.updateMaterial(id, materialData);

      if (response.success) {
        await fetchMaterials();
        return response.data ? normalizeMaterial(response.data) : null;
      } else {
        setError(response.message || 'Failed to update material');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchMaterials]);

  const deleteMaterial = useCallback(async (id: number) => {
    try {
      setError(null);
      const response = await apiClient.deleteMaterial(id);

      if (response.success) {
        await fetchMaterials();
        return true;
      } else {
        setError(response.message || 'Failed to delete material');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchMaterials]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  return {
    materials,
    loading,
    error,
    pagination,
    refetch: fetchMaterials,
    createMaterial,
    updateMaterial,
    deleteMaterial,
  };
}

