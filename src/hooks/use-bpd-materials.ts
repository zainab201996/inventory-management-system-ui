import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { BPDMaterial, BPDMaterialFilters, CreateBPDMaterialData, UpdateBPDMaterialData } from '@/types';

interface UseBPDMaterialsReturn {
  bpdMaterials: BPDMaterial[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  refetch: () => Promise<void>;
  createBPDMaterial: (materialData: CreateBPDMaterialData) => Promise<BPDMaterial | null>;
  updateBPDMaterial: (id: number, materialData: UpdateBPDMaterialData) => Promise<BPDMaterial | null>;
  deleteBPDMaterial: (id: number) => Promise<boolean>;
}

// Helper function to normalize API response to BPDMaterial
const normalizeBPDMaterial = (data: any): BPDMaterial => {
  return {
    bpdm_id: data.bpdm_id || data.id,
    bpd_id: data.bpd_id,
    m_id: data.m_id,
    r_qty: data.r_qty || 0,
    req_remarks: data.req_remarks !== undefined && data.req_remarks !== null ? data.req_remarks : null,
    alloc_qty: data.alloc_qty != null ? data.alloc_qty : null,
    alloc_remarks: data.alloc_remarks !== undefined && data.alloc_remarks !== null ? data.alloc_remarks : null,
    status: data.status !== undefined ? data.status : 0,
    act_qty: data.act_qty != null ? data.act_qty : null,
    act_remarks: data.act_remarks !== undefined && data.act_remarks !== null ? data.act_remarks : null,
    proj_name: data.proj_name,
    step_name: data.step_name,
    business_plan_detail: data.business_plan_detail,
    material: data.material ? {
      id: data.material.m_id || data.material.id,
      name: data.material.m_name || data.material.name,
      description: data.material.description,
      created_at: data.material.created_at || '',
      updated_at: data.material.updated_at || '',
      updated_by: data.material.updated_by,
      updated_by_username: data.material.updated_by_username,
    } : undefined,
  };
};

export function useBPDMaterials(filters: BPDMaterialFilters = {}): UseBPDMaterialsReturn {
  const [bpdMaterials, setBpdMaterials] = useState<BPDMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchBPDMaterials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getBPDMaterials(memoizedFilters);
      
      if (response.success && response.data) {
        const materialsData = Array.isArray(response.data) 
          ? response.data.map(normalizeBPDMaterial)
          : (response.data as any).materials?.map(normalizeBPDMaterial) || [];
        setBpdMaterials(materialsData);
        setPagination((response.data as any).pagination || null);
      } else {
        setError(response.message || 'Failed to fetch BPD materials');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  const createBPDMaterial = useCallback(async (materialData: CreateBPDMaterialData) => {
    try {
      setError(null);
      const response = await apiClient.createBPDMaterial(materialData);
      
      if (response.success) {
        await fetchBPDMaterials();
        return response.data ? normalizeBPDMaterial(response.data) : null;
      } else {
        setError(response.message || 'Failed to create BPD material');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchBPDMaterials]);

  const updateBPDMaterial = useCallback(async (id: number, materialData: UpdateBPDMaterialData) => {
    try {
      setError(null);
      const response = await apiClient.updateBPDMaterial(id, materialData);
      
      if (response.success) {
        await fetchBPDMaterials();
        return response.data ? normalizeBPDMaterial(response.data) : null;
      } else {
        setError(response.message || 'Failed to update BPD material');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchBPDMaterials]);

  const deleteBPDMaterial = useCallback(async (id: number) => {
    try {
      setError(null);
      const response = await apiClient.deleteBPDMaterial(id);
      
      if (response.success) {
        await fetchBPDMaterials();
        return true;
      } else {
        setError(response.message || 'Failed to delete BPD material');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchBPDMaterials]);

  useEffect(() => {
    fetchBPDMaterials();
  }, [fetchBPDMaterials]);

  return {
    bpdMaterials,
    loading,
    error,
    pagination,
    refetch: fetchBPDMaterials,
    createBPDMaterial,
    updateBPDMaterial,
    deleteBPDMaterial,
  };
}
