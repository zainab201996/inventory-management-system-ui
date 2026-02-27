'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuditTrail } from '@/hooks/use-audit-trail'
import { usePages } from '@/hooks/use-pages'
import { useUsers } from '@/hooks/use-users'
import { useSettings } from '@/hooks/use-settings'
import { formatDate, getCurrentFinancialYearDates } from '@/lib/utils'
import { AuditTrail, AuditTrailFilters } from '@/types'
import { Search, Loader2, Filter, X, ArrowUp, ArrowDown, ArrowUpDown, FileText, Calendar } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface SortableTableHeadProps {
  field: string
  children: React.ReactNode
  sortField: string | null
  sortDirection: 'asc' | 'desc'
  onSort: (field: string) => void
}

function SortableTableHead({ field, children, sortField, sortDirection, onSort }: SortableTableHeadProps) {
  const isActive = sortField === field
  const getSortIcon = () => {
    if (!isActive) return <ArrowUpDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
    return sortDirection === 'asc'
      ? <ArrowUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      : <ArrowDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
  }
  return (
    <TableHead
      className="cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-800 normal-case tracking-normal text-theme-xs font-medium text-gray-500 dark:text-gray-400 transition-colors duration-200"
      onClick={() => onSort(field)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSort(field)
        }
      }}
      tabIndex={0}
      role="button"
    >
      <div className="flex items-center gap-2">
        <span className={isActive ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}>{children}</span>
        {getSortIcon()}
      </div>
    </TableHead>
  )
}

export function AuditTrailPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState<string>('timestamp')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')
  const [pageIdFilter, setPageIdFilter] = useState<string>('all')
  const [userIdFilter, setUserIdFilter] = useState<string>('all')
  const [isActionFilter, setIsActionFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Get settings for financial year calculation
  const { settings } = useSettings()
  
  // Calculate default dates from current financial year
  const defaultFinancialYearDates = useMemo(() => {
    if (!settings) return { from_date: '', to_date: '' }
    const yearStart = settings.year_start || '07-01'
    const yearEnd = settings.year_end || '06-30'
    const dates = getCurrentFinancialYearDates(yearStart, yearEnd)
    return dates || { from_date: '', to_date: '' }
  }, [settings])
  
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [fromDateInput, setFromDateInput] = useState<string>('')
  const [toDateInput, setToDateInput] = useState<string>('')
  const datesInitialized = useRef(false)
  
  // Set default dates only once when settings first load
  useEffect(() => {
    if (settings && !datesInitialized.current && defaultFinancialYearDates.from_date && defaultFinancialYearDates.to_date) {
      setFromDate(defaultFinancialYearDates.from_date)
      setToDate(defaultFinancialYearDates.to_date)
      setFromDateInput(defaultFinancialYearDates.from_date)
      setToDateInput(defaultFinancialYearDates.to_date)
      datesInitialized.current = true
    }
  }, [settings, defaultFinancialYearDates])
  
  // Sync input values with filter values when filters change externally
  useEffect(() => {
    setFromDateInput(fromDate)
    setToDateInput(toDate)
  }, [fromDate, toDate])

  // Fetch pages and users for filter dropdowns
  const { pages } = usePages({ all: true })
  const { users } = useUsers({ limit: 1000 }) // Get more users for filter

  const filters: AuditTrailFilters = useMemo(() => ({
    page: currentPage,
    limit: pageSize,
    sort_by: sortField,
    sort_order: sortOrder,
    event_type: eventTypeFilter !== 'all' ? eventTypeFilter as 'create' | 'edit' | 'delete' : undefined,
    page_id: pageIdFilter !== 'all' ? parseInt(pageIdFilter) : undefined,
    userid: userIdFilter !== 'all' ? parseInt(userIdFilter) : undefined,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
    is_action: isActionFilter === 'all' ? undefined : isActionFilter === 'true' ? '1' : isActionFilter === 'false' ? '0' : undefined,
  }), [currentPage, pageSize, sortField, sortOrder, eventTypeFilter, pageIdFilter, userIdFilter, fromDate, toDate, isActionFilter])

  const { auditTrails, loading, error, pagination, refetch } = useAuditTrail(filters)

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const getEventTypeBadge = (eventType: string, isAction?: boolean, pageName?: string) => {
    // Hardcoded list of pages that should always show "Action" badge even if event_type is "edit"
    const actionOnlyPages = [
      'Project Initiation',
      'Complete Issue Resolution',
      'Update Progress Start'
      // Add more page names here that should always show "Action"
    ]
    
    // If it's an action and page is in the override list, show Action badge
    if (isAction && pageName && actionOnlyPages.includes(pageName) && eventType === 'create') {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
          Action
        </span>
      )
    }
    
    // If it's an action and event type is edit, show Edit badge
    if (isAction && eventType === 'edit') {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
          Edit
        </span>
      )
    }
    
    // If it's an action but not edit, show Action badge
    if (isAction) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
          Action
        </span>
      )
    }
    
    // Otherwise show regular event type badge
    const colors = {
      create: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      edit: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[eventType as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {eventType.charAt(0).toUpperCase() + eventType.slice(1)}
      </span>
    )
  }

  const handleClearFilters = () => {
    setEventTypeFilter('all')
    setPageIdFilter('all')
    setUserIdFilter('all')
    setIsActionFilter('all')
    setSearchTerm('')
    setFromDate('')
    setToDate('')
    setCurrentPage(1)
  }

  const hasActiveFilters = eventTypeFilter !== 'all' || pageIdFilter !== 'all' || userIdFilter !== 'all' || isActionFilter !== 'all' || searchTerm || fromDate || toDate

  // Filter audit trails by search term (client-side for username/page name)
  const filteredAuditTrails = useMemo(() => {
    if (!searchTerm) return auditTrails
    const searchLower = searchTerm.toLowerCase()
    return auditTrails.filter(trail =>
      trail.username?.toLowerCase().includes(searchLower) ||
      trail.page_name?.toLowerCase().includes(searchLower) ||
      trail.page_slug?.toLowerCase().includes(searchLower)
    )
  }, [auditTrails, searchTerm])

  if (loading && currentPage === 1) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-gray-600 dark:text-gray-400" />
          <span className="text-gray-600 dark:text-gray-400">Loading audit log...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Log</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          View all system activity and data changes
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>
                Complete history of create, edit, and delete operations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 space-y-4">
            {/* First Row - 3 filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromDate">From Date</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDateInput}
                  onChange={(e) => setFromDateInput(e.target.value)}
                  onBlur={(e) => setFromDate(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="toDate">To Date</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={toDateInput}
                  onChange={(e) => setToDateInput(e.target.value)}
                  onBlur={(e) => setToDate(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Search by user or page..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Second Row - 3 filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eventType">Event Type</Label>
                <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                  <SelectTrigger id="eventType">
                    <SelectValue placeholder="All events" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="edit">Edit</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="page">Page</Label>
                <Select value={pageIdFilter} onValueChange={setPageIdFilter}>
                  <SelectTrigger id="page">
                    <SelectValue placeholder="All pages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Pages</SelectItem>
                    {pages.map((page) => (
                      <SelectItem key={page.page_id} value={page.page_id.toString()}>
                        {page.page_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="user">User</Label>
                <Select value={userIdFilter} onValueChange={setUserIdFilter}>
                  <SelectTrigger id="user">
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Third Row - Action Log Filter */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="isAction">Log Type</Label>
                <Select value={isActionFilter} onValueChange={setIsActionFilter}>
                  <SelectTrigger id="isAction">
                    <SelectValue placeholder="All logs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Logs</SelectItem>
                    <SelectItem value="true">Action Logs Only</SelectItem>
                    <SelectItem value="false">Data Changes Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap">
                {fromDate && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                    <Calendar className="h-3 w-3" />
                    <span>From: {formatDate(fromDate)}</span>
                    <button onClick={() => setFromDate('')} className="ml-1 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {toDate && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                    <Calendar className="h-3 w-3" />
                    <span>To: {formatDate(toDate)}</span>
                    <button onClick={() => setToDate('')} className="ml-1 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {hasActiveFilters && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleClearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Audit Log Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  field="username"
                  sortField={sortField}
                  sortDirection={sortOrder}
                  onSort={handleSort}
                >
                  User
                </SortableTableHead>
                <SortableTableHead
                  field="timestamp"
                  sortField={sortField}
                  sortDirection={sortOrder}
                  onSort={handleSort}
                >
                  Date
                </SortableTableHead>
                <SortableTableHead
                  field="event_type"
                  sortField={sortField}
                  sortDirection={sortOrder}
                  onSort={handleSort}
                >
                  Event Type
                </SortableTableHead>
                <SortableTableHead
                  field="page_name"
                  sortField={sortField}
                  sortDirection={sortOrder}
                  onSort={handleSort}
                >
                  Page
                </SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-600 dark:text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Loading...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredAuditTrails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white">No audit log entries found</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {hasActiveFilters ? 'Try adjusting your filters' : 'No activity has been logged yet'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAuditTrails.map((trail) => (
                  <TableRow key={trail.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <TableCell className="text-gray-700 dark:text-gray-300">
                      {trail.username}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900 dark:text-white">
                      {formatDate(trail.timestamp)}
                    </TableCell>
                    <TableCell>
                      {getEventTypeBadge(trail.event_type, trail.is_action, trail.page_name)}
                    </TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300">
                      {trail.page_name}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>


          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, pagination.total)} of {pagination.total} entries
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  Previous
                </Button>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Page {currentPage} of {pagination.total_pages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(pagination.total_pages, prev + 1))}
                  disabled={currentPage === pagination.total_pages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
