'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useUserAccess } from '@/hooks/use-user-access'
import { getSlugForRoute, requiresPermission } from '@/lib/route-permissions'
import { apiClient } from '@/lib/api-client'

interface RouteGuardProps {
  children: React.ReactNode
}

/**
 * RouteGuard Component
 * 
 * Protects routes based on user permissions.
 * If user doesn't have permission for a route, redirects to /unauthorized
 */
export function RouteGuard({ children }: RouteGuardProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { access, loading } = useUserAccess()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    // Always allow access to login and unauthorized pages
    if (pathname === '/unauthorized' || pathname === '/login') {
      setIsAuthorized(true)
      return
    }

    // Check if user is authenticated (has token)
    const token = apiClient.getAccessToken()
    if (!token) {
      // No token - redirect to login
      if (pathname !== '/login') {
        router.push('/login')
      }
      setIsAuthorized(false)
      return
    }

    // Don't check permissions during loading
    if (loading) {
      setIsAuthorized(null)
      return
    }

    // If no access data after loading, user might not be logged in properly
    // Allow dashboard but redirect others to login
    if (!access) {
      if (pathname === '/' || pathname === '/dashboard') {
        setIsAuthorized(true)
        return
      }
      router.push('/login')
      setIsAuthorized(false)
      return
    }

    // Always allow access to dashboard and settings
    // Dashboard is visible for all authenticated users (it may show an empty state if no reports are allowed)
    // Settings is unrestricted and accessible to all authenticated users
    if (pathname === '/' || pathname === '/dashboard' || pathname === '/settings') {
      setIsAuthorized(true)
      return
    }

    // Check if this route requires permission
    if (!requiresPermission(pathname)) {
      // Route doesn't require permission, allow access
      setIsAuthorized(true)
      return
    }

    // Get the slug(s) for this route
    const slugOrSlugs = getSlugForRoute(pathname)
    if (!slugOrSlugs) {
      // Route is in mapping but slug not found (shouldn't happen)
      setIsAuthorized(false)
      return
    }

    // Check if user has show permission for this slug(s)
    // aggregatedPermissions uses slugs as keys, so check directly
    // If slugOrSlugs is an array, check if user has permission for any of them
    let hasPermission = false
    if (Array.isArray(slugOrSlugs)) {
      hasPermission = slugOrSlugs.some(slug => access.aggregatedPermissions[slug]?.show === true)
    } else {
      hasPermission = access.aggregatedPermissions[slugOrSlugs]?.show === true
    }
    setIsAuthorized(hasPermission)

    // Redirect to unauthorized if no permission
    if (!hasPermission) {
      router.push('/unauthorized')
    }
  }, [pathname, access, loading, router])

  // Show nothing while checking permissions
  if (loading || isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  // If not authorized, don't render children (redirect will happen)
  if (!isAuthorized) {
    return null
  }

  // Authorized, render children
  return <>{children}</>
}
