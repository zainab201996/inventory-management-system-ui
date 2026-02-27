'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { apiClient } from '@/lib/api-client'
import { UserDepartment, UserDepartmentFilters } from '@/types'

interface UseUsersDepartmentsReturn {
  userDepartments: UserDepartment[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  } | null
  refetch: () => Promise<void>
  createUserDepartment: (userDepartmentData: { user_id: number; dept_id: number }) => Promise<UserDepartment | null>
  updateUserDepartment: (id: number, userDepartmentData: { user_id?: number; dept_id?: number }) => Promise<UserDepartment | null>
  deleteUserDepartment: (id: number) => Promise<boolean>
}

export function useUsersDepartments(filters: UserDepartmentFilters = {}): UseUsersDepartmentsReturn {
  const [userDepartments, setUserDepartments] = useState<UserDepartment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<{
    page: number
    limit: number
    total: number
    total_pages: number
  } | null>(null)

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)])

  const fetchUserDepartments = useCallback(async () => {
    // Don't fetch if user_id is not provided
    if (!memoizedFilters.user_id) {
      setUserDepartments([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.getUsersDepartments({ ...memoizedFilters, all: true })
      
      if (response.success && response.data) {
        const rawData = Array.isArray(response.data) 
          ? response.data 
          : (response.data as any).userDepartments || []
        
        // Normalize the data to ensure proper structure
        const userDepartmentsData = rawData.map((item: any): UserDepartment => ({
          ud_id: item.ud_id,
          user_id: item.user_id,
          dept_id: item.dept_id,
          created_at: item.created_at,
          user: item.user,
          department: item.department ? {
            dept_id: item.department.dept_id,
            name: item.department.name,
            description: item.department.description,
            created_at: item.department.created_at,
            updated_at: item.department.updated_at || item.department.created_at,
            updated_by: item.department.updated_by,
            updated_by_username: item.department.updated_by_username,
          } : undefined,
        }))
        
        setUserDepartments(userDepartmentsData)
        setPagination((response.data as any).pagination || null)
      } else {
        setError(response.message || 'Failed to fetch user departments')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [memoizedFilters])

  const createUserDepartment = useCallback(async (userDepartmentData: { user_id: number; dept_id: number }) => {
    try {
      setError(null)
      const response = await apiClient.createUserDepartment(userDepartmentData)
      
      if (response.success) {
        await fetchUserDepartments()
        return response.data ?? null
      } else {
        setError(response.message || 'Failed to create user department')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    }
  }, [fetchUserDepartments])

  const updateUserDepartment = useCallback(async (id: number, userDepartmentData: { user_id?: number; dept_id?: number }) => {
    try {
      setError(null)
      const response = await apiClient.updateUserDepartment(id, userDepartmentData)
      
      if (response.success) {
        await fetchUserDepartments()
        return response.data ?? null
      } else {
        setError(response.message || 'Failed to update user department')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    }
  }, [fetchUserDepartments])

  const deleteUserDepartment = useCallback(async (id: number) => {
    try {
      setError(null)
      const response = await apiClient.deleteUserDepartment(id)
      
      if (response.success) {
        await fetchUserDepartments()
        return true
      } else {
        setError(response.message || 'Failed to delete user department')
        return false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return false
    }
  }, [fetchUserDepartments])

  useEffect(() => {
    fetchUserDepartments()
  }, [fetchUserDepartments])

  return {
    userDepartments,
    loading,
    error,
    pagination,
    refetch: fetchUserDepartments,
    createUserDepartment,
    updateUserDepartment,
    deleteUserDepartment,
  }
}
