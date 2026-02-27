'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useProjectIssuesReport } from '@/hooks/use-project-issues-report'
import { useProjectTypes } from '@/hooks/use-project-types'
import { useSettings } from '@/hooks/use-settings'
import { useDepartments } from '@/hooks/use-departments'
import { useUserAccess } from '@/hooks/use-user-access'
import { formatDate, getCurrentFinancialYearDates, getDurationBetweenDates } from '@/lib/utils'
import { ProjectIssuesReportFilters } from '@/types'
import { Search, Loader2, X, ArrowUp, ArrowDown, ArrowUpDown, FileText, ChevronDown, ChevronRight } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

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

const getStatusDisplay = (status: number) => {
  switch (status) {
    case 0: return 'Open'
    case 2: return 'Resolved'
    default: return 'Unknown'
  }
}

const getStatusBadgeColor = (status: number) => {
  switch (status) {
    case 0: return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    case 2: return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
  }
}

export function ProjectIssuesReportPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState<string>('proj_name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [ptypeIdFilter, setPtypeIdFilter] = useState<string>('all')
  const [deptIdFilter, setDeptIdFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set())
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const datesInitialized = useRef(false)

  // Fetch filter options
  const { projectTypes } = useProjectTypes({ all: true })
  const { settings } = useSettings()
  
  // Fetch all departments for filtering
  const { departments, loading: departmentsLoading } = useDepartments({ all: true })

  // Set default dates to current financial year when settings load (only once)
  useEffect(() => {
    if (settings && !datesInitialized.current && !fromDate && !toDate) {
      const yearStart = settings.year_start || '07-01'
      const yearEnd = settings.year_end || '06-30'
      const currentFYDates = getCurrentFinancialYearDates(yearStart, yearEnd)
      if (currentFYDates) {
        setFromDate(currentFYDates.from_date)
        setToDate(currentFYDates.to_date)
        datesInitialized.current = true
      }
    }
  }, [settings, fromDate, toDate])

  // Debounce search term to avoid refetching on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1) // Reset to page 1 when search changes
    }, 500) // 500ms delay

    return () => clearTimeout(timer)
  }, [searchTerm])

  const filters: ProjectIssuesReportFilters = useMemo(() => ({
    page: currentPage,
    limit: pageSize,
    sort_by: sortField,
    sort_order: sortOrder,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    ptype_id: ptypeIdFilter !== 'all' ? parseInt(ptypeIdFilter) : undefined,
    dept_id: deptIdFilter !== 'all' ? parseInt(deptIdFilter) : undefined,
    proj_name: debouncedSearchTerm || undefined,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
  }), [currentPage, pageSize, sortField, sortOrder, statusFilter, ptypeIdFilter, deptIdFilter, debouncedSearchTerm, fromDate, toDate])

  const { projects, loading, error, pagination } = useProjectIssuesReport(filters)

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleClearFilters = () => {
    setStatusFilter('all')
    setPtypeIdFilter('all')
    setDeptIdFilter('all')
    setSearchTerm('')
    setFromDate('')
    setToDate('')
    datesInitialized.current = true // Prevent useEffect from resetting dates
    setCurrentPage(1)
  }

  const hasActiveFilters = statusFilter !== 'all' || ptypeIdFilter !== 'all' || deptIdFilter !== 'all' || searchTerm || fromDate || toDate

  const toggleProjectExpansion = (projId: number) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev)
      if (newSet.has(projId)) {
        newSet.delete(projId)
      } else {
        newSet.add(projId)
      }
      return newSet
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Wise Issues</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          View projects with their issues (Open or Resolved)
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Projects with Issues</CardTitle>
              <CardDescription>
                View projects with their associated issues
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Row 1 */}
              <div className="space-y-2">
                <Label htmlFor="from-date">From Date</Label>
                <Input
                  id="from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to-date">To Date</Label>
                <Input
                  id="to-date"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="search">Search Project Name</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Search by project name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Row 2 */}
              <div className="space-y-2">
                <Label htmlFor="status">Issue Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="0">Open</SelectItem>
                    <SelectItem value="2">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectType">Project Type</Label>
                <Select value={ptypeIdFilter} onValueChange={setPtypeIdFilter}>
                  <SelectTrigger id="projectType">
                    <SelectValue placeholder="All project types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Project Types</SelectItem>
                    {projectTypes.map((pt) => (
                      <SelectItem key={pt.id} value={pt.id.toString()}>
                        {pt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={deptIdFilter} onValueChange={setDeptIdFilter} disabled={departmentsLoading}>
                  <SelectTrigger id="department">
                    <SelectValue placeholder={departmentsLoading ? "Loading..." : "All departments"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.dept_id} value={dept.dept_id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

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

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <SortableTableHead
                  field="proj_name"
                  sortField={sortField}
                  sortDirection={sortOrder}
                  onSort={handleSort}
                >
                  Project Name
                </SortableTableHead>
                <TableHead className="normal-case">Project Type</TableHead>
                <TableHead className="normal-case">Department</TableHead>
                <SortableTableHead
                  field="issue_count"
                  sortField={sortField}
                  sortDirection={sortOrder}
                  onSort={handleSort}
                >
                  Total Issues
                </SortableTableHead>
                <SortableTableHead
                  field="open_count"
                  sortField={sortField}
                  sortDirection={sortOrder}
                  onSort={handleSort}
                >
                  Open
                </SortableTableHead>
                <SortableTableHead
                  field="completed_count"
                  sortField={sortField}
                  sortDirection={sortOrder}
                  onSort={handleSort}
                >
                  Resolved
                </SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : !loading && projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white">No projects with issues found</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {hasActiveFilters ? 'Try adjusting your filters' : 'No projects have issues yet'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {loading && projects.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-2 bg-blue-50/50 dark:bg-blue-900/10">
                        <div className="flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Updating data...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {projects.flatMap((project) => {
                  const isExpanded = expandedProjects.has(project.proj_id)
                  return [
                    <TableRow key={project.proj_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleProjectExpansion(project.proj_id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium text-gray-900 dark:text-white">
                        {project.proj_name}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {project.project_type?.name || 'N/A'}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {project.department?.name || 'N/A'}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        <Badge variant="outline">{project.issue_counts.total}</Badge>
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        <Badge className={getStatusBadgeColor(0)}>
                          {project.issue_counts.open}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        <Badge className={getStatusBadgeColor(2)}>
                          {project.issue_counts.completed}
                        </Badge>
                      </TableCell>
                    </TableRow>,
                    ...(isExpanded && project.issues.length > 0 ? [
                      <TableRow key={`${project.proj_id}-expanded`}>
                        <TableCell colSpan={7} className="bg-gray-50 dark:bg-gray-900/30 p-0">
                          <div className="p-4">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                              Issues for {project.proj_name}
                            </h4>
                            <div className="space-y-2">
                              {project.issues.map((issue) => {
                                const duration = getDurationBetweenDates(issue.opened_at, issue.completed_at)
                                return (
                                <div
                                  key={issue.pi_id}
                                  className="flex items-start gap-4 p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="font-medium text-gray-900 dark:text-white">
                                        {issue.issue?.name || 'N/A'}
                                      </span>
                                      <Badge className={getStatusBadgeColor(issue.status)}>
                                        {getStatusDisplay(issue.status)}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                      Step:{' '}
                                      {issue.step_name
                                        || (issue.s_id != null ? `Step ${issue.s_id}` : 'N/A')}
                                    </p>
                                    {issue.remarks_1 && (
                                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        <span className="font-medium">Opening Remarks:</span> {issue.remarks_1}
                                      </p>
                                    )}
                                    {issue.remarks_3 && (
                                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        <span className="font-medium">Resolved Remarks:</span> {issue.remarks_3}
                                      </p>
                                    )}
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                      {issue.opened_at && (
                                        <span>Opened: {formatDate(issue.opened_at)}</span>
                                      )}
                                      {issue.completed_at && (
                                        <span>Resolved: {formatDate(issue.completed_at)}</span>
                                      )}
                                      {duration && (
                                        <span className="font-medium text-gray-700 dark:text-gray-300">
                                          Duration: {duration}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                )
                              })}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ] : [])
                  ]
                })}
                </>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, pagination.total)} of {pagination.total} projects
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
