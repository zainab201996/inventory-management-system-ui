import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'

interface UserAccess {
  user: {
    id: number
    username: string
    is_active: boolean
    circle_id?: number | null
    division_id?: number | null
    sub_division_id?: number | null
    created_at: string
    updated_at: string
    roles?: Array<{
      role_id: number
      role_name: string
      created_at: string
    }>
    department?: {
      dept_id: number
      name: string
    }
    circle?: {
      id: number
      name: string
    }
    division?: {
      id: number
      name: string
    }
    sub_division?: {
      id: number
      name: string
    }
  }
  roles: Array<{
    role_id: number
    role_name: string
    created_at: string
  }>
  permissions: Array<{
    page_id: number
    slug: string
    show: boolean
    create: boolean
    edit: boolean
    delete: boolean
    role_id: number
    role_name: string
  }>
  aggregatedPermissions: Record<string, {
    show: boolean
    create: boolean
    edit: boolean
    delete: boolean
  }>
}

let cachedUserId: number | null = null
let cachedAccess: UserAccess | null = null
let cachedError: string | null = null
let inFlight: Promise<UserAccess> | null = null

export function useUserAccess() {
  const currentUserId = apiClient.getUserId()
  const hasValidCache = currentUserId != null && cachedUserId === currentUserId && cachedAccess != null

  const [access, setAccess] = useState<UserAccess | null>(hasValidCache ? cachedAccess : null)
  const [loading, setLoading] = useState(!hasValidCache)
  const [error, setError] = useState<string | null>(cachedError)

  useEffect(() => {
    const fetchUserAccess = async () => {
      try {
        const userId = apiClient.getUserId()
        // If user changes, clear cache
        if (cachedUserId !== userId) {
          cachedUserId = userId
          cachedAccess = null
          cachedError = null
          inFlight = null
        }

        if (!userId) {
          // No user ID - user is not logged in or token doesn't contain user_id
          // This is not an error, just means user needs to log in
          setAccess(null)
          setError(null)
          cachedAccess = null
          cachedError = null
          setLoading(false)
          return
        }

        // Serve from cache if possible
        if (cachedAccess) {
          setAccess(cachedAccess)
          setError(null)
          setLoading(false)
          return
        }

        if (cachedError) {
          setAccess(null)
          setError(cachedError)
          setLoading(false)
          return
        }

        setLoading(true)
        setError(null)

        // Re-use in-flight request if another component already triggered it
        if (!inFlight) {
          inFlight = (async () => {
            // Small delay to ensure localStorage is updated after login
            await new Promise(resolve => setTimeout(resolve, 100))

            const response = await apiClient.getUserAccess(userId)
            if (response.success && response.data) return response.data
            throw new Error(response.message || 'Failed to fetch user access')
          })()
        }

        const data = await inFlight
        if (!data) {
          throw new Error('Failed to fetch user access: no data returned')
        }
        cachedAccess = data
        cachedError = null
        setAccess(data)

        // Debug: log permissions for troubleshooting
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
          console.log('✅ User Access Loaded:', {
            userId,
            aggregatedPermissions: data.aggregatedPermissions,
            subDivisionsPermission: data.aggregatedPermissions['sub-divisions'],
            totalPermissions: Object.keys(data.aggregatedPermissions).length
          })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'An error occurred'
        cachedError = msg
        cachedAccess = null
        setError(msg)
      } finally {
        inFlight = null
        setLoading(false)
      }
    }

    fetchUserAccess()
  }, [])

  return { access, loading, error }
}

/**
 * Map sidebar item names to their corresponding slugs
 */
const nameToSlugMap: Record<string, string> = {
  'Circles': 'circles',
  'Divisions': 'divisions',
  'Sub Divisions': 'sub-divisions',
  'Users': 'users',
  'Roles': 'roles',
  'Departments': 'departments',
  'Project Types': 'project-types',
  'Delay Reasons': 'delay-reasons',
  'Steps': 'steps',
  'Business Plans': 'business-plans',
  'Project Initiation': 'business-plan-start',
  'Project Cancellation': 'business-plan-cancel',
  'Update Progress Start': 'business-plan-detail-start',
  'Update Progress Complete': 'business-plan-detail-complete',
  'Audit Log': 'audit-trail',
  'Projects Report': 'projects-report',
  'Dashboard': 'dashboard',
  'Project Wise Issues': 'project-issues-report',
  'Project Status Snapshot Report': 'projects-status-snapshot-report',
  'Progress By Project Type Report': 'progress-by-project-type-report',
  'Progress By Department Report': 'progress-by-department-report',
  'Quarter Wise Projects Report': 'quarter-wise-projects-report',
  'Funding Source Mix Report': 'funding-source-mix-report',
  'KPIs Report': 'kpis-report',
  'Issues': 'issues',
  'Project Issues': 'project-issues',
  'Project Issue Create': 'project-issue-create',
  'Project Issue Open': 'project-issue-open',
  'Project Issue Complete': 'project-issue-complete',
}

/**
 * Get slug for a sidebar item name
 */
export function getSlugForName(name: string): string {
  return nameToSlugMap[name] || name.toLowerCase().replace(/\s+/g, '-')
}

/**
 * Check if user has permission to show a page using slug
 */
export function hasShowPermission(
  pageName: string,
  aggregatedPermissions: Record<string, {
    show: boolean
    create: boolean
    edit: boolean
    delete: boolean
  }> | undefined
): boolean {
  if (!aggregatedPermissions) return false
  
  const slug = getSlugForName(pageName)
  
  // Check if slug exists in permissions
  if (aggregatedPermissions[slug]) {
    return aggregatedPermissions[slug].show === true
  }
  
  // If slug not found in permissions, deny access by default
  return false
}

/**
 * Check if user has show permission for a slug directly
 */
export function hasShowPermissionBySlug(
  slug: string,
  aggregatedPermissions: Record<string, {
    show: boolean
    create: boolean
    edit: boolean
    delete: boolean
  }> | undefined
): boolean {
  if (!aggregatedPermissions) return false
  
  // Check if slug exists in permissions
  if (aggregatedPermissions[slug]) {
    return aggregatedPermissions[slug].show === true
  }
  
  // If slug not found in permissions, deny access by default
  return false
}

/**
 * Hook to check if user has show permission for a specific slug
 */
export function useHasPermission(slug: string): boolean {
  const { access, loading } = useUserAccess()
  
  if (loading || !access) return false
  
  return hasShowPermissionBySlug(slug, access.aggregatedPermissions)
}
