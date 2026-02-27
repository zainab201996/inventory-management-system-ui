'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useUsersReport } from '@/hooks/use-users-report'
import { formatDate, formatNumber } from '@/lib/utils'
import { UsersReportUser, UsersReportFilters } from '@/types'
import { Search, Loader2, X, ArrowUp, ArrowDown, ArrowUpDown, FileText, User, Shield, Building2, Users, Building } from 'lucide-react'
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

export function UsersReportPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState<string>('username')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [searchTerm, setSearchTerm] = useState('')

  const filters: UsersReportFilters = useMemo(() => ({
    page: currentPage,
    limit: pageSize,
    sort_by: sortField as UsersReportFilters['sort_by'],
    sort_order: sortOrder,
  }), [currentPage, pageSize, sortField, sortOrder])

  const { users, loading, error, pagination, departmentStatistics, usersWithAllDepartmentsCount, refetch } = useUsersReport(filters)

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setCurrentPage(1)
  }

  const hasActiveFilters = searchTerm !== ''

  // Filter users by search term (client-side for username, email, full name)
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users
    const searchLower = searchTerm.toLowerCase()
    return users.filter(user =>
      user.username?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.sap_code?.toString().includes(searchLower) ||
      user.p_num?.toLowerCase().includes(searchLower)
    )
  }, [users, searchTerm])

  // Calculate total exclusive users from department statistics
  const totalExclusiveUsers = useMemo(() => {
    return departmentStatistics.reduce((sum, dept) => sum + dept.exclusive_users_count, 0)
  }, [departmentStatistics])

  if (loading && currentPage === 1) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-gray-600 dark:text-gray-400" />
          <span className="text-gray-600 dark:text-gray-400">Loading users report...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users Report</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          View all users with their departments, roles, and metadata
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card className="bg-white shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:bg-gray-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatNumber(pagination?.total || 0)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              All registered users
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:bg-gray-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Users with All Departments
            </CardTitle>
            <Building className="h-4 w-4 text-green-500 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatNumber(usersWithAllDepartmentsCount)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Users assigned to all departments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Department Statistics Cards */}
      {departmentStatistics.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Department Statistics
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {departmentStatistics.map((dept) => (
              <Card 
                key={dept.dept_id} 
                className="bg-white shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:bg-gray-900"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate pr-2">
                    {dept.name}
                  </CardTitle>
                  <Building2 className="h-4 w-4 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatNumber(dept.exclusive_users_count)}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Exclusive users
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Users Report</CardTitle>
              <CardDescription>
                Complete list of active users.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="search" className="text-sm font-medium text-gray-700 dark:text-gray-300">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Search by username, email, name, SAP code, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
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

          {/* Users Table */}
          <div className="w-full overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader>
              <TableRow>
                <SortableTableHead
                  field="username"
                  sortField={sortField}
                  sortDirection={sortOrder}
                  onSort={handleSort}
                >
                  Username
                </SortableTableHead>
                <SortableTableHead
                  field="full_name"
                  sortField={sortField}
                  sortDirection={sortOrder}
                  onSort={handleSort}
                >
                  Full Name
                </SortableTableHead>
                <TableHead className="normal-case tracking-normal text-theme-xs font-medium text-gray-500 dark:text-gray-400 min-w-[200px]">
                  Departments
                </TableHead>
                <TableHead className="normal-case tracking-normal text-theme-xs font-medium text-gray-500 dark:text-gray-400 min-w-[200px]">
                  Roles
                </TableHead>
                <SortableTableHead
                  field="sap_code"
                  sortField={sortField}
                  sortDirection={sortOrder}
                  onSort={handleSort}
                >
                  SAP Code
                </SortableTableHead>
                <SortableTableHead
                  field="email"
                  sortField={sortField}
                  sortDirection={sortOrder}
                  onSort={handleSort}
                >
                  Email
                </SortableTableHead>
                <SortableTableHead
                  field="p_num"
                  sortField={sortField}
                  sortDirection={sortOrder}
                  onSort={handleSort}
                >
                  Phone
                </SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-600 dark:text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Loading...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white">No users found</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {hasActiveFilters ? 'Try adjusting your filters' : 'No users have been created yet'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <TableCell className="font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        {user.username}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300">
                      {user.full_name || 'N/A'}
                    </TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300 min-w-[200px]">
                      {user.departments && user.departments.length > 0 ? (
                        <div className="flex flex-wrap gap-1 justify-start">
                          {user.departments.map((dept) => (
                            <Badge key={dept.dept_id} variant="outline" className="text-xs">
                              <Building2 className="h-3 w-3 mr-1" />
                              {dept.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-start">No departments</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300 min-w-[200px]">
                      {user.roles && user.roles.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <Badge key={role.role_id} variant="outline" className="text-xs">
                              <Shield className="h-3 w-3 mr-1" />
                              {role.role_name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">No roles</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300">
                      {user.sap_code || 'N/A'}
                    </TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300">
                      {user.email || 'N/A'}
                    </TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300">
                      {user.p_num || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>

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
