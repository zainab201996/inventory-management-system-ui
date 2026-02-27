/**
 * Global Route to Slug Mapping
 * 
 * This file maps route paths to their corresponding permission slugs.
 * When adding a new page:
 * 1. Add the route path and slug to this mapping
 * 2. The sidebar and route protection will automatically use it
 * 
 * Format: route path -> permission slug (string) or array of slugs (string[])
 */
export const ROUTE_PERMISSIONS: Record<string, string | string[]> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  // Inventory System Routes
  '/stores': 'stores',
  '/items': 'items',
  '/rates': 'rates',
  '/store-transfer-notes': 'store-transfer-notes',
  '/report/stock': 'stock-report',
  '/report/stock-transfer-detail': 'stock-transfer-detail-report',
  // Legacy Project Management Routes (keeping for reference, can be removed later)
  '/circles': 'circles',
  '/divisions': 'divisions',
  '/sub-divisions': 'sub-divisions',
  '/users': 'users',
  '/roles': 'roles',
  '/departments': 'departments',
  '/project-types': 'project-types',
  '/delay-reasons': 'delay-reasons',
  '/steps': 'steps',
  '/issues': 'issues',
  '/issues-categories': 'issues-categories',
  '/funding-sources': 'funding-sources',
  '/materials': 'materials',
  '/project-issues': 'project-issues',
  '/project-issues/open': 'project-issue-open',
  '/project-issues/complete': 'project-issue-complete',
  '/business-plans': 'business-plans',
  '/project-initiation': 'business-plan-start',
  '/update-progress': ['business-plan-detail-start', 'business-plan-detail-complete'], // Allow access if user has either permission
  '/project-cancellation': 'business-plan-cancel',
  '/materials-allocation': 'bpd-material-allocate', // Use bpd-material-allocate permission for materials allocation
  '/report/audit-trail': 'audit-trail',
  '/report/projects': 'projects-report',
  '/report/projects-summary': 'projects-summary-report',
  '/report/project-issues': 'project-issues-report',
  '/report/issues-detail': 'issues-detail-report',
  '/report/materials': 'materials-report',
  '/report/users': 'users-report',
  // '/settings' is intentionally unrestricted - no permission check required
}

/**
 * Get slug(s) for a route path
 * Returns a string for single slug, or array for multiple slugs
 */
export function getSlugForRoute(route: string): string | string[] | null {
  return ROUTE_PERMISSIONS[route] || null
}

/**
 * Get all routes that require a specific slug permission
 */
export function getRoutesForSlug(slug: string): string[] {
  return Object.entries(ROUTE_PERMISSIONS)
    .filter(([_, routeSlug]) => {
      if (Array.isArray(routeSlug)) {
        return routeSlug.includes(slug)
      }
      return routeSlug === slug
    })
    .map(([route]) => route)
}

/**
 * Check if a route requires permission
 */
export function requiresPermission(route: string): boolean {
  // Store Transfer Detail report is currently unrestricted - any authenticated user can access it.
  // Once backend page slugs/permissions are configured for this report, this special case can be removed.
  if (route === '/report/stock-transfer-detail') {
    return false
  }

  return route in ROUTE_PERMISSIONS
}
