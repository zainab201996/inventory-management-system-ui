'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Users,
  Menu,
  ChevronDown,
  Globe,
  LayoutDashboard,
  PlayCircle,
  Calendar,
  BarChart,
  Store,
  Package,
  DollarSign,
  ArrowLeftRight,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUserAccess } from '@/hooks/use-user-access'
import { getSlugForRoute } from '@/lib/route-permissions'

type NavItem = {
  name: string
  icon: React.ReactNode
  path?: string
  subItems?: { name: string; path: string; isHeading?: boolean }[]
}

// Areas section with subItems
const areasItems: NavItem[] = [
  {
    icon: <Globe className="w-5 h-5" />,
    name: 'Areas',
    subItems: [
      { name: 'Circles', path: '/circles' },
    ],
  },
]

// User Management section with subItems
const userManagementItems: NavItem[] = [
  {
    icon: <Users className="w-5 h-5" />,
    name: 'User Management',
    subItems: [
      { name: 'Users', path: '/users' },
      { name: 'Roles', path: '/roles' },
    ],
  },
]

// Actions section with subItems
const actionsItems: NavItem[] = [
  {
    icon: <PlayCircle className="w-5 h-5" />,
    name: 'Actions',
    subItems: [
      { name: 'Projects', path: '', isHeading: true },
      { name: 'Project Initiation', path: '/project-initiation' },
      { name: 'Update Progress', path: '/update-progress' },
      { name: 'Project Cancellation', path: '/project-cancellation' },
    ],
  },
]

// Planning section with subItems
const planningItems: NavItem[] = [
  {
    icon: <Calendar className="w-5 h-5" />,
    name: 'Planning',
    subItems: [
      { name: 'Steps', path: '/steps' },
      { name: 'Project Types', path: '/project-types' },
    ],
  },
]

// Reports section with subItems
const reportsItems: NavItem[] = [
  {
    icon: <BarChart className="w-5 h-5" />,
    name: 'Reports',
    subItems: [
      { name: 'Projects Summary', path: '/report/projects-summary' },
    ],
  },
]

// Inventory System - Profiles section
const inventoryProfilesItems: NavItem[] = [
  {
    icon: <FileText className="w-5 h-5" />,
    name: 'Profiles',
    subItems: [
      { name: 'Stores', path: '/stores' },
      { name: 'Items', path: '/items' },
      { name: 'Rates', path: '/rates' },
    ],
  },
]

// Inventory System - Transactions section
const inventoryTransactionsItems: NavItem[] = [
  {
    icon: <ArrowLeftRight className="w-5 h-5" />,
    name: 'Transactions',
    subItems: [
      { name: 'Store Transfer Note', path: '/store-transfer-notes' },
    ],
  },
]

// Inventory System - Reports section
const inventoryReportsItems: NavItem[] = [
  {
    icon: <BarChart className="w-5 h-5" />,
    name: 'Reports',
    subItems: [
      { name: 'Stock Report', path: '/report/stock' },
      { name: 'Stock Transfer Detail', path: '/report/stock-transfer-detail' },
    ],
  },
]

// Main navigation items
const mainNavItems: NavItem[] = [
  {
    icon: <Settings className="w-5 h-5" />,
    name: 'Settings',
    path: '/settings',
  },
]

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [isHoverExpanded, setIsHoverExpanded] = useState(false)
  const { access, loading, error } = useUserAccess()

  // Debug logging
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('Sidebar State:', { loading, hasAccess: !!access, error, aggregatedPermissions: access?.aggregatedPermissions })
    }
  }, [loading, access, error])

  const isEffectivelyCollapsed = isCollapsed && !isHoverExpanded
  const isExpanded = !isEffectivelyCollapsed
  const isHovered = isHoverExpanded

  // Helper function to check if user has permission for a slug or array of slugs
  const hasPermissionForSlug = useCallback((slugOrSlugs: string | string[] | null): boolean => {
    if (!slugOrSlugs || !access) return false
    if (Array.isArray(slugOrSlugs)) {
      return slugOrSlugs.some(slug => access.aggregatedPermissions[slug]?.show === true)
    }
    return access.aggregatedPermissions[slugOrSlugs]?.show === true
  }, [access])

  // Filter items based on permissions
  const filteredAreasItems = useMemo(() => {
    // Wait for permissions to load before showing anything
    if (loading || !access) return []
    
    return areasItems.map(item => {
      if (item.subItems) {
        const filteredSubItems = item.subItems.filter(subItem => {
          // Get slug from route path
          const slug = getSlugForRoute(subItem.path)
          return hasPermissionForSlug(slug)
        })
        // Only show parent item if it has at least one visible subItem
        return filteredSubItems.length > 0 
          ? { ...item, subItems: filteredSubItems }
          : null
      }
      // For items without subItems, check by route path
      if (item.path) {
        const slug = getSlugForRoute(item.path)
        return hasPermissionForSlug(slug) ? item : null
      }
      return null
    }).filter((item): item is NavItem => item !== null)
  }, [access, loading, hasPermissionForSlug])

  const filteredUserManagementItems = useMemo(() => {
    // Wait for permissions to load before showing anything
    if (loading || !access) return []
    
    return userManagementItems.map(item => {
      if (item.subItems) {
        const filteredSubItems = item.subItems.filter(subItem => {
          // Get slug from route path
          const slug = getSlugForRoute(subItem.path)
          return hasPermissionForSlug(slug)
        })
        // Only show parent item if it has at least one visible subItem
        return filteredSubItems.length > 0 
          ? { ...item, subItems: filteredSubItems }
          : null
      }
      // For items without subItems, check by route path
      if (item.path) {
        const slug = getSlugForRoute(item.path)
        return hasPermissionForSlug(slug) ? item : null
      }
      return null
    }).filter((item): item is NavItem => item !== null)
  }, [access, loading, hasPermissionForSlug])

  const filteredActionsItems = useMemo(() => {
    // Wait for permissions to load before showing anything
    if (loading || !access) return []
    
    return actionsItems.map(item => {
      if (item.subItems) {
        // Process subItems: keep headings and filter regular items by permissions
        const processedSubItems: { name: string; path: string; isHeading?: boolean }[] = []
        let currentHeading: { name: string; path: string; isHeading?: boolean } | null = null
        
        item.subItems.forEach((subItem, index) => {
          if (subItem.isHeading) {
            // Store the heading but don't add it yet
            currentHeading = subItem
          } else {
            // Check permission for regular items
            const slug = getSlugForRoute(subItem.path)
            if (hasPermissionForSlug(slug)) {
              // If we have a pending heading, add it first
              if (currentHeading) {
                processedSubItems.push(currentHeading)
                currentHeading = null
              }
              processedSubItems.push(subItem)
            }
          }
        })
        
        // Only show parent item if it has at least one visible subItem (excluding headings)
        const hasVisibleItems = processedSubItems.some(item => !item.isHeading)
        return hasVisibleItems 
          ? { ...item, subItems: processedSubItems }
          : null
      }
      // For items without subItems, check by route path
      if (item.path) {
        const slug = getSlugForRoute(item.path)
        return hasPermissionForSlug(slug) ? item : null
      }
      return null
    }).filter((item): item is NavItem => item !== null)
  }, [access, loading, hasPermissionForSlug])

  const filteredPlanningItems = useMemo(() => {
    // Wait for permissions to load before showing anything
    if (loading || !access) return []
    
    return planningItems.map(item => {
      if (item.subItems) {
        const filteredSubItems = item.subItems.filter(subItem => {
          // Get slug from route path
          const slug = getSlugForRoute(subItem.path)
          return hasPermissionForSlug(slug)
        })
        // Only show parent item if it has at least one visible subItem
        return filteredSubItems.length > 0 
          ? { ...item, subItems: filteredSubItems }
          : null
      }
      // For items without subItems, check by route path
      if (item.path) {
        const slug = getSlugForRoute(item.path)
        return hasPermissionForSlug(slug) ? item : null
      }
      return null
    }).filter((item): item is NavItem => item !== null)
  }, [access, loading, hasPermissionForSlug])

  const filteredReportsItems = useMemo(() => {
    // Wait for permissions to load before showing anything
    if (loading || !access) return []
    
    return reportsItems.map(item => {
      if (item.subItems) {
        // Process subItems: keep headings and filter regular items by permissions
        const processedSubItems: { name: string; path: string; isHeading?: boolean }[] = []
        let currentHeading: { name: string; path: string; isHeading?: boolean } | null = null
        
        item.subItems.forEach((subItem, index) => {
          if (subItem.isHeading) {
            // Store the heading but don't add it yet
            currentHeading = subItem
          } else {
            // Check permission for regular items
            const slug = getSlugForRoute(subItem.path)
            if (hasPermissionForSlug(slug)) {
              // If we have a pending heading, add it first
              if (currentHeading) {
                processedSubItems.push(currentHeading)
                currentHeading = null
              }
              processedSubItems.push(subItem)
            }
          }
        })
        
        // Only show parent item if it has at least one visible subItem (excluding headings)
        const hasVisibleItems = processedSubItems.some(item => !item.isHeading)
        return hasVisibleItems 
          ? { ...item, subItems: processedSubItems }
          : null
      }
      // For items without subItems, check by route path
      if (item.path) {
        const slug = getSlugForRoute(item.path)
        return hasPermissionForSlug(slug) ? item : null
      }
      return null
    }).filter((item): item is NavItem => item !== null)
  }, [access, loading, hasPermissionForSlug])

  // Filter inventory menu items based on permissions
  const filteredInventoryProfilesItems = useMemo(() => {
    // Wait for permissions to load before showing anything
    if (loading || !access) return []
    
    if (!access.aggregatedPermissions || Object.keys(access.aggregatedPermissions).length === 0) {
      return inventoryProfilesItems
    }
    
    const result = inventoryProfilesItems.map(item => {
      if (item.subItems) {
        const filteredSubItems = item.subItems.filter(subItem => {
          const slug = getSlugForRoute(subItem.path)
          const hasPermission = hasPermissionForSlug(slug)
          if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
            console.log(`🔍 Checking permission for ${subItem.name} (${subItem.path}):`, {
              slug,
              hasPermission,
              permission: access.aggregatedPermissions[slug]
            })
          }
          return hasPermission
        })
        // Only show parent item if it has at least one visible subItem
        return filteredSubItems.length > 0 
          ? { ...item, subItems: filteredSubItems }
          : null
      }
      if (item.path) {
        const slug = getSlugForRoute(item.path)
        return hasPermissionForSlug(slug) ? item : null
      }
      return null
    }).filter((item): item is NavItem => item !== null)
    
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('🔍 Filtered Profiles Items:', result)
    }
    
    return result
  }, [access, loading, hasPermissionForSlug])

  const filteredInventoryTransactionsItems = useMemo(() => {
    // Always show inventory transactions for now (permissions will be set up later)
    // TODO: Add proper permission checks once backend permissions are configured
    return inventoryTransactionsItems
  }, [])

  const filteredInventoryReportsItems = useMemo(() => {
    // Always show inventory reports for now (permissions will be set up later)
    // TODO: Add proper permission checks once backend permissions are configured
    return inventoryReportsItems
  }, [])

  const filteredMainNavItems = useMemo(() => {
    // Wait for permissions to load before showing anything
    if (loading || !access) return []
    
    return mainNavItems.filter(item => {
      if (!item.path) return false
      // Get slug from route path
      const slug = getSlugForRoute(item.path)
      return hasPermissionForSlug(slug)
    })
  }, [access, loading])

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: 'areas' | 'userManagement' | 'actions' | 'planning' | 'reports' | 'profiles' | 'settings' | 'main'
  ) => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? 'menu-item-active'
                  : 'menu-item-inactive'
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? 'lg:justify-center'
                  : 'lg:justify-start'
              }`}
            >
              <span
                className={`${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? 'menu-item-icon-active'
                    : 'menu-item-icon-inactive'
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered) && (
                <ChevronDown
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? 'rotate-180 text-brand-500'
                      : ''
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? 'menu-item-active' : 'menu-item-inactive'
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path)
                      ? 'menu-item-icon-active'
                      : 'menu-item-icon-inactive'
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : '0px',
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem, subIndex) => {
                  if (subItem.isHeading) {
                    return (
                      <li key={`${subItem.name}-heading-${subIndex}`} className="mt-3 mb-1 first:mt-0">
                        <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 px-3">
                          {subItem.name}
                        </span>
                      </li>
                    )
                  }
                  return (
                    <li key={`${subItem.path}-${subIndex}`} className="ml-4">
                      <Link
                        href={subItem.path}
                        className={`menu-dropdown-item ${
                          isActive(subItem.path)
                            ? 'menu-dropdown-item-active'
                            : 'menu-dropdown-item-inactive'
                        }`}
                      >
                        {subItem.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  )

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: 'areas' | 'userManagement' | 'actions' | 'planning' | 'reports' | 'profiles' | 'transactions' | 'settings' | 'main'
    index: number
  } | null>(null)
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({})
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const isActive = useCallback((path: string) => path === pathname, [pathname])

  useEffect(() => {
    // Check if the current path matches any submenu item
    let submenuMatched = false
    const allItems = [
      { items: filteredAreasItems, type: 'areas' as const },
      { items: filteredUserManagementItems, type: 'userManagement' as const },
      { items: filteredActionsItems, type: 'actions' as const },
      { items: filteredPlanningItems, type: 'planning' as const },
      { items: filteredInventoryProfilesItems, type: 'profiles' as const },
      { items: filteredInventoryTransactionsItems, type: 'transactions' as const },
      { items: filteredInventoryReportsItems, type: 'reports' as const },
      { items: filteredReportsItems, type: 'reports' as const },
      { items: filteredMainNavItems, type: 'main' as const },
    ]

    allItems.forEach(({ items, type }) => {
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type,
                index,
              })
              submenuMatched = true
            }
          })
        }
      })
    })

    // If no submenu item matches, close the open submenu
    if (!submenuMatched) {
      setOpenSubmenu(null)
    }
  }, [pathname, isActive, filteredAreasItems, filteredUserManagementItems, filteredActionsItems, filteredPlanningItems, filteredInventoryProfilesItems, filteredInventoryTransactionsItems, filteredInventoryReportsItems, filteredReportsItems, filteredMainNavItems])

  useEffect(() => {
    // Set the height of the submenu items when the submenu is opened
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }))
      }
    }
  }, [openSubmenu])

  const handleSubmenuToggle = (
    index: number,
    menuType: 'areas' | 'userManagement' | 'actions' | 'planning' | 'reports' | 'profiles' | 'settings' | 'main'
  ) => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null
      }
      return { type: menuType, index }
    })
  }

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900',
        isEffectivelyCollapsed ? 'w-[90px]' : 'w-[290px]'
      )}
      onMouseEnter={() => {
        if (isCollapsed) setIsHoverExpanded(true)
      }}
      onMouseLeave={() => {
        if (isCollapsed) setIsHoverExpanded(false)
      }}
    >
      <div
        className={cn(
          'flex py-8',
          !isExpanded && !isHovered ? 'lg:justify-center' : 'justify-start'
        )}
      >
        <Link href="/">
          <Image
            src="/images/logo/auth-logo.svg"
            alt="Logo"
            width={150}
            height={40}
            className="object-contain"
          />
        </Link>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            {/* Dashboard at top */}
            <div>
              <h2
                className={cn(
                  'mb-4 flex text-xs uppercase leading-[20px] text-gray-400',
                  !isExpanded && !isHovered
                    ? 'lg:justify-center'
                    : 'justify-start'
                )}
              >
                {isExpanded || isHovered ? (
                  'Dashboard'
                ) : (
                  <Menu className="h-4 w-4" />
                )}
              </h2>
              <ul className="flex flex-col gap-4">
                <li>
                  <Link
                    href="/"
                    className={`menu-item group ${
                      isActive('/') ? 'menu-item-active' : 'menu-item-inactive'
                    }`}
                  >
                    <span
                      className={`${
                        isActive('/')
                          ? 'menu-item-icon-active'
                          : 'menu-item-icon-inactive'
                      }`}
                    >
                      <LayoutDashboard className="w-5 h-5" />
                    </span>
                    {(isExpanded || isHovered) && (
                      <span className="menu-item-text">Dashboard</span>
                    )}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Areas section */}
            {filteredAreasItems.length > 0 && (
              <div>
                <h2
                  className={cn(
                    'mb-4 flex text-xs uppercase leading-[20px] text-gray-400',
                    !isExpanded && !isHovered
                      ? 'lg:justify-center'
                      : 'justify-start'
                  )}
                >
                  {isExpanded || isHovered ? (
                    'Areas'
                  ) : (
                    <Menu className="h-4 w-4" />
                  )}
                </h2>
                {renderMenuItems(filteredAreasItems, 'areas')}
              </div>
            )}

            {/* Actions section */}
            {filteredActionsItems.length > 0 && (
              <div>
                <h2
                  className={cn(
                    'mb-4 flex text-xs uppercase leading-[20px] text-gray-400',
                    !isExpanded && !isHovered
                      ? 'lg:justify-center'
                      : 'justify-start'
                  )}
                >
                  {isExpanded || isHovered ? (
                    'Actions'
                  ) : (
                    <Menu className="h-4 w-4" />
                  )}
                </h2>
                {renderMenuItems(filteredActionsItems, 'actions')}
              </div>
            )}

            {/* Planning section */}
            {filteredPlanningItems.length > 0 && (
              <div>
                <h2
                  className={cn(
                    'mb-4 flex text-xs uppercase leading-[20px] text-gray-400',
                    !isExpanded && !isHovered
                      ? 'lg:justify-center'
                      : 'justify-start'
                  )}
                >
                  {isExpanded || isHovered ? (
                    'Planning'
                  ) : (
                    <Menu className="h-4 w-4" />
                  )}
                </h2>
                {renderMenuItems(filteredPlanningItems, 'planning')}
              </div>
            )}

            {/* Inventory System - Profiles section */}
            <div>
              <h2
                className={cn(
                  'mb-4 flex text-xs uppercase leading-[20px] text-gray-400',
                  !isExpanded && !isHovered
                    ? 'lg:justify-center'
                    : 'justify-start'
                )}
              >
                {isExpanded || isHovered ? (
                  'Profiles'
                ) : (
                  <Menu className="h-4 w-4" />
                )}
              </h2>
              {renderMenuItems(filteredInventoryProfilesItems, 'profiles')}
            </div>

            {/* Inventory System - Transactions section */}
            <div>
              <h2
                className={cn(
                  'mb-4 flex text-xs uppercase leading-[20px] text-gray-400',
                  !isExpanded && !isHovered
                    ? 'lg:justify-center'
                    : 'justify-start'
                )}
              >
                {isExpanded || isHovered ? (
                  'Transactions'
                ) : (
                  <Menu className="h-4 w-4" />
                )}
              </h2>
              {renderMenuItems(filteredInventoryTransactionsItems, 'transactions')}
            </div>

            {/* Inventory System - Reports section */}
            <div>
              <h2
                className={cn(
                  'mb-4 flex text-xs uppercase leading-[20px] text-gray-400',
                  !isExpanded && !isHovered
                    ? 'lg:justify-center'
                    : 'justify-start'
                )}
              >
                {isExpanded || isHovered ? (
                  'Inventory Reports'
                ) : (
                  <Menu className="h-4 w-4" />
                )}
              </h2>
              {renderMenuItems(filteredInventoryReportsItems, 'reports')}
            </div>

            {/* Reports section */}
            {filteredReportsItems.length > 0 && (
              <div>
                <h2
                  className={cn(
                    'mb-4 flex text-xs uppercase leading-[20px] text-gray-400',
                    !isExpanded && !isHovered
                      ? 'lg:justify-center'
                      : 'justify-start'
                  )}
                >
                  {isExpanded || isHovered ? (
                    'Reports'
                  ) : (
                    <Menu className="h-4 w-4" />
                  )}
                </h2>
                {renderMenuItems(filteredReportsItems, 'reports')}
              </div>
            )}

            {/* Main navigation */}
            {filteredMainNavItems.length > 0 && (
              <div>
                <h2
                  className={cn(
                    'mb-4 flex text-xs uppercase leading-[20px] text-gray-400',
                    !isExpanded && !isHovered
                      ? 'lg:justify-center'
                      : 'justify-start'
                  )}
                >
                  {isExpanded || isHovered ? (
                    'Menu'
                  ) : (
                    <Menu className="h-4 w-4" />
                  )}
                </h2>
                {renderMenuItems(filteredMainNavItems, 'main')}
              </div>
            )}
          </div>
        </nav>
      </div>
    </aside>
  )
}
