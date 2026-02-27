'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { apiClient } from '@/lib/api-client'
import { UserSubDivision, UserSubDivisionFilters } from '@/types'

interface UseUsersSubDivisionsReturn {
  userSubDivisions: UserSubDivision[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  } | null
  refetch: () => Promise<void>
  createUserSubDivision: (userSubDivisionData: { user_id: number; sd_id: number }) => Promise<UserSubDivision | null>
  updateUserSubDivision: (id: number, userSubDivisionData: { user_id?: number; sd_id?: number }) => Promise<UserSubDivision | null>
  deleteUserSubDivision: (id: number) => Promise<boolean>
}

export function useUsersSubDivisions(filters: UserSubDivisionFilters = {}): UseUsersSubDivisionsReturn {
  const [userSubDivisions, setUserSubDivisions] = useState<UserSubDivision[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<{
    page: number
    limit: number
    total: number
    total_pages: number
  } | null>(null)

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)])

  const fetchUserSubDivisions = useCallback(async () => {
    // Don't fetch if user_id is not provided
    if (!memoizedFilters.user_id) {
      setUserSubDivisions([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.getUsersSubDivisions({ ...memoizedFilters, all: true })
      
      if (response.success && response.data) {
        const rawData = Array.isArray(response.data) 
          ? response.data 
          : (response.data as any).userSubDivisions || []
        
        // Normalize the data to ensure proper structure
        const userSubDivisionsData = rawData.map((item: any): UserSubDivision => ({
          usd_id: item.usd_id,
          user_id: item.user_id,
          sd_id: item.sd_id,
          created_at: item.created_at,
          user: item.user,
          sub_division: item.sub_division ? {
            id: item.sub_division.id,
            name: item.sub_division.name,
            division_id: item.sub_division.division_id,
            description: item.sub_division.description,
            created_at: item.sub_division.created_at,
            updated_at: item.sub_division.updated_at || item.sub_division.created_at,
            updated_by: item.sub_division.updated_by,
            updated_by_username: item.sub_division.updated_by_username,
            division: item.sub_division.division,
            circle: item.sub_division.circle || item.sub_division.division?.circle,
          } : undefined,
        }))
        
        setUserSubDivisions(userSubDivisionsData)
        setPagination((response.data as any).pagination || null)
      } else {
        setError(response.message || 'Failed to fetch user sub divisions')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [memoizedFilters])

  const createUserSubDivision = useCallback(async (userSubDivisionData: { user_id: number; sd_id: number }) => {
    try {
      setError(null)
      const response = await apiClient.createUserSubDivision(userSubDivisionData)
      
      if (response.success) {
        await fetchUserSubDivisions()
        return response.data ?? null
      } else {
        setError(response.message || 'Failed to create user sub division')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    }
  }, [fetchUserSubDivisions])

  const updateUserSubDivision = useCallback(async (id: number, userSubDivisionData: { user_id?: number; sd_id?: number }) => {
    try {
      setError(null)
      const response = await apiClient.updateUserSubDivision(id, userSubDivisionData)
      
      if (response.success) {
        await fetchUserSubDivisions()
        return response.data ?? null
      } else {
        setError(response.message || 'Failed to update user sub division')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    }
  }, [fetchUserSubDivisions])

  const deleteUserSubDivision = useCallback(async (id: number) => {
    try {
      setError(null)
      const response = await apiClient.deleteUserSubDivision(id)
      
      if (response.success) {
        await fetchUserSubDivisions()
        return true
      } else {
        setError(response.message || 'Failed to delete user sub division')
        return false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return false
    }
  }, [fetchUserSubDivisions])

  useEffect(() => {
    fetchUserSubDivisions()
  }, [fetchUserSubDivisions])

  return {
    userSubDivisions,
    loading,
    error,
    pagination,
    refetch: fetchUserSubDivisions,
    createUserSubDivision,
    updateUserSubDivision,
    deleteUserSubDivision,
  }
}
