'use client'

import Link from 'next/link'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useUsers } from '@/hooks/use-users'
import { useRoles } from '@/hooks/use-roles'
import { useDepartments } from '@/hooks/use-departments'
import { useCircles } from '@/hooks/use-circles'
import { useDivisions } from '@/hooks/use-divisions'
import { useSubDivisions } from '@/hooks/use-sub-divisions'
import { useUsersSubDivisions } from '@/hooks/use-users-sub-divisions'
import { useUsersDepartments } from '@/hooks/use-users-departments'
import { formatDate, cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import { User, CreateUserData, UpdateUserData } from '@/types'
import { Search, Plus, Edit, Trash2, Loader2, X, CheckCircle, Filter, ArrowUp, ArrowDown, ArrowUpDown, Layers, Hash, Calendar, User as UserIcon, Mail, Phone, Tag, Building, Shield, Copy } from 'lucide-react'
import { AdvancedFilterDialog, FilterField, FilterOperator } from '@/components/ui/advanced-filter-dialog'
import Checkbox from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

// Filter configuration for users
const userFilterFields: FilterField[] = [
  { value: 'username', label: 'Username', type: 'text' },
  { value: 'role', label: 'Role', type: 'text' },
  { value: 'circle', label: 'Circle', type: 'text' },
  { value: 'division', label: 'Division', type: 'text' },
  { value: 'sub_division', label: 'Sub Division', type: 'text' },
  { value: 'is_active', label: 'Status', type: 'status', options: [
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' }
  ]},
  { value: 'created_at', label: 'Created Date', type: 'date' }
]

const getUserOperatorsForField = (field: string): FilterOperator[] => {
  switch (field) {
    case 'created_at':
      return [
        { value: 'is', label: 'Is', requiresValue: true },
        { value: 'isNot', label: 'Is not', requiresValue: true },
        { value: 'after', label: 'After', requiresValue: true },
        { value: 'onOrAfter', label: 'On or after', requiresValue: true },
        { value: 'before', label: 'Before', requiresValue: true },
        { value: 'onOrBefore', label: 'On or before', requiresValue: true },
        { value: 'isEmpty', label: 'Is empty', requiresValue: false },
        { value: 'isNotEmpty', label: 'Is not empty', requiresValue: false }
      ]
    case 'is_active':
      return [
        { value: 'is', label: 'Is', requiresValue: true },
        { value: 'isNot', label: 'Is not', requiresValue: true },
        { value: 'isEmpty', label: 'Is empty', requiresValue: false },
        { value: 'isNotEmpty', label: 'Is not empty', requiresValue: false }
      ]
    default: // text fields
      return [
        { value: 'contains', label: 'Contains', requiresValue: true },
        { value: 'doesNotContain', label: 'Does not contain', requiresValue: true },
        { value: 'equals', label: 'Equals', requiresValue: true },
        { value: 'doesNotEqual', label: 'Does not equal', requiresValue: true },
        { value: 'startsWith', label: 'Starts with', requiresValue: true },
        { value: 'endsWith', label: 'Ends with', requiresValue: true },
        { value: 'isAnyOf', label: 'Is any of', requiresValue: true },
        { value: 'isEmpty', label: 'Is empty', requiresValue: false },
        { value: 'isNotEmpty', label: 'Is not empty', requiresValue: false }
      ]
  }
}

// Sortable Table Header Component
interface SortableTableHeadProps {
  field: string
  children: React.ReactNode
  sortField: string | null
  sortDirection: 'asc' | 'desc'
  onSort: (field: string) => void
  className?: string
}

function SortableTableHead({ field, children, sortField, sortDirection, onSort, className }: SortableTableHeadProps) {
  const isActive = sortField === field
  
  const getSortIcon = () => {
    if (!isActive) return <ArrowUpDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
    return sortDirection === 'asc'
      ? <ArrowUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      : <ArrowDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
  }

  return (
    <TableHead 
      className={`cursor-pointer select-none hover:bg-gray-50 normal-case tracking-normal text-theme-xs font-medium text-gray-500 dark:text-gray-400 transition-colors duration-200 ${className || ''}`}
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

export function UsersPage() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterModel, setFilterModel] = useState({
    items: [] as Array<{
      id: number;
      field: string;
      operator: string;
      value: any;
    }>,
    logicOperator: 'and' as 'and' | 'or'
  })
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  
  // Sorting state
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Sorting logic
  const sortUsers = useCallback((users: User[], field: string, direction: 'asc' | 'desc') => {
    return [...users].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (field) {
        case 'username':
          aValue = a.username?.toLowerCase() || ''
          bValue = b.username?.toLowerCase() || ''
          break
      case 'role':
        aValue = a.roles?.map(r => r.role_name).join(', ').toLowerCase() || ''
        bValue = b.roles?.map(r => r.role_name).join(', ').toLowerCase() || ''
        break
      case 'circle':
          aValue = a.circle?.name?.toLowerCase() || ''
          bValue = b.circle?.name?.toLowerCase() || ''
          break
        case 'division':
          aValue = a.division?.name?.toLowerCase() || ''
          bValue = b.division?.name?.toLowerCase() || ''
          break
        case 'sub_division':
          aValue = a.sub_division?.name?.toLowerCase() || ''
          bValue = b.sub_division?.name?.toLowerCase() || ''
          break
        case 'status':
          aValue = a.is_active ? 'active' : 'inactive'
          bValue = b.is_active ? 'active' : 'inactive'
          break
        case 'created':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        default:
          return 0
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1
      if (aValue > bValue) return direction === 'asc' ? 1 : -1
      return 0
    })
  }, [])
  
  const filters = useMemo(() => ({
    // Note: searchTerm is handled client-side, not sent to API
    is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
    page: currentPage,
    limit: 50,
  }), [statusFilter, currentPage])
  
  const { users, loading, error, pagination, createUser, updateUser, deleteUser, refetch: refetchUsers } = useUsers(filters)

  // Reset users when server-side filters change (not searchTerm - that's client-side only)
  // Use a stable dependency to avoid React warning about changing array size
  const statusFilterValue = statusFilter || 'all'
  useEffect(() => {
    setAllUsers([])
    setCurrentPage(1)
    setHasMore(true)
  }, [statusFilterValue])

  // Accumulate users when new page loads
  useEffect(() => {
    if (users.length > 0) {
      if (currentPage === 1) {
        setAllUsers(users)
      } else {
        setAllUsers(prev => [...prev, ...users])
      }
      
      if (pagination) {
        setHasMore(currentPage < pagination.total_pages)
      }
    }
  }, [users, currentPage, pagination])

  useEffect(() => {
    setLoadingMore(false)
  }, [users])

  // Helper function to get field value from user
  const getUserFieldValue = (user: User, field: string) => {
    switch (field) {
      case 'username':
        return user.username || ''
      case 'role':
        return user.roles?.map(r => r.role_name).join(', ') || ''
      case 'circle':
        return user.circle?.name || ''
      case 'division':
        return user.division?.name || ''
      case 'sub_division':
        return user.sub_division?.name || ''
      case 'is_active':
        return user.is_active ? 'true' : 'false'
      case 'created_at':
        return user.created_at
      default:
        return ''
    }
  }

  // Helper function to apply filter condition
  const applyUserFilterCondition = (fieldValue: any, operator: string, filterValue: any) => {
    if ((!filterValue || filterValue.toString().trim() === '') && operator !== 'isEmpty' && operator !== 'isNotEmpty') {
      return false
    }

    switch (operator) {
      case 'contains':
        return fieldValue.toString().toLowerCase().includes(filterValue.toString().toLowerCase())
      case 'doesNotContain':
        return !fieldValue.toString().toLowerCase().includes(filterValue.toString().toLowerCase())
      case 'equals':
        return fieldValue.toString().toLowerCase() === filterValue.toString().toLowerCase()
      case 'doesNotEqual':
        return fieldValue.toString().toLowerCase() !== filterValue.toString().toLowerCase()
      case 'startsWith':
        return fieldValue.toString().toLowerCase().startsWith(filterValue.toString().toLowerCase())
      case 'endsWith':
        return fieldValue.toString().toLowerCase().endsWith(filterValue.toString().toLowerCase())
      case 'isAnyOf':
        const values = filterValue.toString().split(',').map((v: string) => v.trim().toLowerCase())
        return values.includes(fieldValue.toString().toLowerCase())
      case 'isEmpty':
        return !fieldValue || fieldValue.toString().trim() === ''
      case 'isNotEmpty':
        return fieldValue && fieldValue.toString().trim() !== ''
      case 'is':
        return fieldValue === filterValue
      case 'isNot':
        return fieldValue !== filterValue
      case 'after':
        return new Date(fieldValue) > new Date(filterValue)
      case 'onOrAfter':
        return new Date(fieldValue) >= new Date(filterValue)
      case 'before':
        return new Date(fieldValue) < new Date(filterValue)
      case 'onOrBefore':
        return new Date(fieldValue) <= new Date(filterValue)
      default:
        return true
    }
  }

  // Apply filters to users data
  const filteredUsers = useMemo(() => {
    let filtered = allUsers

    // Apply basic search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.roles?.some(r => r.role_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        user.circle?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.division?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.sub_division?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => 
        (statusFilter === 'active' && user.is_active) ||
        (statusFilter === 'inactive' && !user.is_active)
      )
    }

    // Apply advanced filters
    if (filterModel.items.length > 0) {
      filtered = filtered.filter(user => {
        const results = filterModel.items.map(filterItem => {
          const fieldValue = getUserFieldValue(user, filterItem.field)
          return applyUserFilterCondition(fieldValue, filterItem.operator, filterItem.value)
        })

        return filterModel.logicOperator === 'and'
          ? results.every(result => result)
          : results.some(result => result)
      })
    }

    // Apply sorting
    if (sortField) {
      filtered = sortUsers(filtered, sortField, sortDirection)
    }

    return filtered
  }, [allUsers, searchTerm, statusFilter, filterModel, sortField, sortDirection, sortUsers])

  const hasActiveFilters = filterModel.items.length > 0 || searchTerm || statusFilter !== 'all'

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true)
      setCurrentPage(prev => prev + 1)
    }
  }

  // Value input renderer for the filter dialog
  const getUserValueInput = (field: FilterField, operator: string, value: any, onChange: (value: any) => void) => {
    if (operator === 'isEmpty' || operator === 'isNotEmpty') {
      return (
        <div className="px-3 py-2 text-sm text-gray-500 bg-gray-100 rounded-md border h-9 flex items-center">
          No value needed
        </div>
      )
    }

    switch (field.type) {
      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9"
          />
        )
      case 'status':
        if (operator === 'isAnyOf') {
          return (
            <Input
              placeholder="Enter values separated by commas (e.g., true,false)"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="h-9"
            />
          )
        }
        return (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm h-9"
          >
            <option value="">Select status</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )
      default: // text
        if (operator === 'isAnyOf') {
          return (
            <Input
              placeholder="Enter values separated by commas"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="h-9"
            />
          )
        }
        return (
          <Input
            placeholder="Enter value"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9"
          />
        )
    }
  }

  const getOperatorDisplay = (operator: string) => {
    const operatorMap: { [key: string]: string } = {
      'contains': 'contains',
      'doesNotContain': 'does not contain',
      'equals': 'equals',
      'doesNotEqual': 'does not equal',
      'startsWith': 'starts with',
      'endsWith': 'ends with',
      'isAnyOf': 'is any of',
      'isEmpty': 'is empty',
      'isNotEmpty': 'is not empty',
      'is': 'is',
      'isNot': 'is not',
      'after': 'after',
      'onOrAfter': 'on or after',
      'before': 'before',
      'onOrBefore': 'on or before'
    }
    return operatorMap[operator] || operator
  }

  const handleClearFilters = () => {
    setFilterModel({
      items: [],
      logicOperator: 'and'
    })
    setSearchTerm('')
    setStatusFilter('all')
  }

  // Master-Detail state
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  // Delete confirmation dialog
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Sub Division management dialog (only for delete confirmation)
  const [isDeleteSubDivisionDialogOpen, setIsDeleteSubDivisionDialogOpen] = useState(false)
  const [subDivisionToDelete, setSubDivisionToDelete] = useState<number | null>(null)
  const [isDeletingSubDivision, setIsDeletingSubDivision] = useState(false)
  
  // Interactive grid state for sub-divisions
  const [pendingSubDivisionChanges, setPendingSubDivisionChanges] = useState<Map<number, boolean>>(new Map())
  const [isSavingSubDivisions, setIsSavingSubDivisions] = useState(false)
  
  // Interactive state for departments
  const [pendingDepartmentChanges, setPendingDepartmentChanges] = useState<Map<number, boolean>>(new Map())
  const [isSavingDepartments, setIsSavingDepartments] = useState(false)

  const [formData, setFormData] = useState<CreateUserData>({
    username: '',
    password: '',
    role_ids: [],
    full_name: '',
    sap_code: undefined,
    email: '',
    p_num: '',
  })
  
  // Sub division assignments for new/edit user
  const [selectedSubDivisionIds, setSelectedSubDivisionIds] = useState<number[]>([])
  // Department assignments for new/edit user
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<number[]>([])
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
    department_id?: string;
    role_ids?: string;
    full_name?: string;
    sap_code?: string;
    email?: string;
    p_num?: string;
  }>({})

  const { roles } = useRoles({ all: true })
  const { departments, loading: departmentsLoading, error: departmentsError } = useDepartments({ all: true })
  const { circles } = useCircles({ all: true })
  const { divisions } = useDivisions({ all: true })
  const { subDivisions } = useSubDivisions({ all: true })
  const { 
    userSubDivisions, 
    loading: userSubDivisionsLoading, 
    error: userSubDivisionsError, 
    createUserSubDivision, 
    deleteUserSubDivision, 
    refetch: refetchUserSubDivisions 
  } = useUsersSubDivisions({ user_id: selectedUser?.id, all: true })
  const {
    userDepartments,
    loading: userDepartmentsLoading,
    error: userDepartmentsError,
    createUserDepartment,
    deleteUserDepartment,
    refetch: refetchUserDepartments
  } = useUsersDepartments({ user_id: selectedUser?.id, all: true })

  const validateForm = () => {
    const newErrors: {
      username?: string;
      password?: string;
      department_id?: string;
      role_ids?: string;
      full_name?: string;
      sap_code?: string;
      email?: string;
      p_num?: string;
    } = {}
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    } else if (formData.username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    } else if (formData.username.trim().length > 100) {
      newErrors.username = 'Username must be less than 100 characters'
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username.trim())) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores'
    }
    
    if (!editingUser) {
      if (!formData.password) {
        newErrors.password = 'Password is required'
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters'
      } else if (formData.password.length > 100) {
        newErrors.password = 'Password must be less than 100 characters'
      }
    } else if (formData.password && formData.password.length > 0) {
      if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters'
      } else if (formData.password.length > 100) {
        newErrors.password = 'Password must be less than 100 characters'
      }
    }
    
    // Department is now optional - removed requirement
    
    if (!formData.role_ids || formData.role_ids.length === 0) {
      newErrors.role_ids = 'At least one role is required'
    }
    
    // Validate full_name (required)
    if (!formData.full_name || !formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required'
    } else if (formData.full_name.trim().length > 255) {
      newErrors.full_name = 'Full name must be less than 255 characters'
    }
    
    // Validate sap_code (required)
    if (formData.sap_code === undefined || formData.sap_code === null) {
      newErrors.sap_code = 'SAP code is required'
    } else if (!Number.isInteger(formData.sap_code) || formData.sap_code <= 0) {
      newErrors.sap_code = 'SAP code must be a positive integer'
    }
    
    // Validate email (optional, but if provided must be valid)
    if (formData.email && formData.email.trim()) {
      const trimmedEmail = formData.email.trim()
      // More comprehensive email validation regex
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
      if (trimmedEmail.length > 255) {
        newErrors.email = 'Email must be less than 255 characters'
      } else if (!emailRegex.test(trimmedEmail)) {
        newErrors.email = 'Please enter a valid email address (e.g., user@example.com)'
      }
    }
    
    // Validate p_num/phone (optional, but if provided must be numeric and valid length)
    if (formData.p_num && formData.p_num.trim()) {
      if (!/^\d+$/.test(formData.p_num.trim())) {
        newErrors.p_num = 'Phone number must contain only numbers'
      } else if (formData.p_num.trim().length > 100) {
        newErrors.p_num = 'Phone number must be less than 100 characters'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleOpenDialog = async (user?: User) => {
    if (user) {
      // Prevent editing user with ID 1
      if (user.id === 1) {
        return
      }
      setEditingUser(user)
      setFormData({
        username: user.username,
        password: '',
        department_id: 0, // Not used anymore, kept for API compatibility
        role_ids: user.roles?.map(r => r.role_id) || [],
        full_name: user.full_name || '',
        sap_code: user.sap_code || undefined,
        email: user.email || '',
        p_num: user.p_num || '',
      })
      // Load existing sub divisions for this user
      try {
        const response = await apiClient.getUsersSubDivisions({ user_id: user.id, all: true })
        if (response.success && response.data) {
          const subDivisions = Array.isArray(response.data) ? response.data : response.data.userSubDivisions || []
          setSelectedSubDivisionIds(subDivisions.map((usd: any) => usd.sd_id))
        } else {
          setSelectedSubDivisionIds([])
      setSelectedDepartmentIds([])
        }
      } catch (error) {
        console.error('Failed to load user sub divisions:', error)
        setSelectedSubDivisionIds([])
      setSelectedDepartmentIds([])
      }
      // Load existing departments for this user
      try {
        const response = await apiClient.getUsersDepartments({ user_id: user.id, all: true })
        if (response.success && response.data) {
          const departments = Array.isArray(response.data) ? response.data : response.data.userDepartments || []
          setSelectedDepartmentIds(departments.map((ud: any) => ud.dept_id))
        } else {
          setSelectedDepartmentIds([])
        }
      } catch (error) {
        console.error('Failed to load user departments:', error)
        setSelectedDepartmentIds([])
      }
    } else {
      setEditingUser(null)
      setFormData({
        username: '',
        password: '',
        department_id: 0, // Not used anymore, kept for API compatibility
        role_ids: [],
        full_name: '',
        sap_code: undefined,
        email: '',
        p_num: '',
      })
      setSelectedSubDivisionIds([])
      setSelectedDepartmentIds([])
    }
    setErrors({})
    setIsDialogOpen(true)
  }

  const handleDuplicateUser = async (user: User) => {
    // Prevent duplicating user with ID 1
    if (user.id === 1) {
      return
    }
    // Set editingUser to null to open in create mode
    setEditingUser(null)
    // Pre-fill form data with user's data, but modify username and clear sap_code, email, p_num
    setFormData({
      username: `copy of ${user.username}`,
      password: '',
      department_id: 0, // Not used anymore, kept for API compatibility
      role_ids: user.roles?.map(r => r.role_id) || [],
      full_name: user.full_name || '',
      sap_code: undefined, // Empty as per requirement
      email: '', // Empty as per requirement
      p_num: '', // Empty as per requirement
    })
    // Load existing sub divisions for this user to pre-select them
    try {
      const response = await apiClient.getUsersSubDivisions({ user_id: user.id, all: true })
      if (response.success && response.data) {
        const subDivisions = Array.isArray(response.data) ? response.data : response.data.userSubDivisions || []
        setSelectedSubDivisionIds(subDivisions.map((usd: any) => usd.sd_id))
      } else {
        setSelectedSubDivisionIds([])
      }
    } catch (error) {
      console.error('Failed to load user sub divisions:', error)
      setSelectedSubDivisionIds([])
    }
    // Load existing departments for this user to pre-select them
    try {
      const response = await apiClient.getUsersDepartments({ user_id: user.id, all: true })
      if (response.success && response.data) {
        const departments = Array.isArray(response.data) ? response.data : response.data.userDepartments || []
        setSelectedDepartmentIds(departments.map((ud: any) => ud.dept_id))
      } else {
        setSelectedDepartmentIds([])
      }
    } catch (error) {
      console.error('Failed to load user departments:', error)
      setSelectedDepartmentIds([])
    }
    setErrors({})
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    if (isCreating || isUpdating) return
    setIsDialogOpen(false)
    setEditingUser(null)
    setFormData({
      username: '',
      password: '',
      department_id: 0, // Not used anymore, kept for API compatibility
      role_ids: [],
      full_name: '',
      sap_code: undefined,
      email: '',
      p_num: '',
    })
    setSelectedSubDivisionIds([])
    setSelectedDepartmentIds([])
    setErrors({})
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }
    
    // Prevent updating user with ID 1
    if (editingUser && editingUser.id === 1) {
      return
    }
    
    try {
      let userId: number
      
      if (editingUser) {
        setIsUpdating(true)
        const updateData: UpdateUserData = {
          username: formData.username,
          // department_id removed - departments are managed separately
          role_ids: formData.role_ids,
          full_name: formData.full_name,
          sap_code: formData.sap_code,
          email: formData.email?.trim() || undefined,
          p_num: formData.p_num?.trim() || undefined,
        }
        if (formData.password) {
          updateData.password = formData.password
        }
        
        // Call API directly to get error message from response
        try {
          const response = await apiClient.updateUser(editingUser.id, updateData)
          if (!response.success) {
            const errorMessage = response.message || response.error || 'Failed to update user. Please check your input and try again.'
            toast({
              title: 'Failed to Update User',
              description: errorMessage,
              variant: 'destructive',
            })
            return
          }
          // Update was successful, refresh the users list
          await refetchUsers()
        } catch (apiError: any) {
          const errorMessage = apiError?.message || apiError?.response?.data?.message || apiError?.response?.data?.error || 'Failed to update user. Please try again.'
          toast({
            title: 'Failed to Update User',
            description: errorMessage,
            variant: 'destructive',
          })
          return
        }
        
        userId = editingUser.id
        
        // Update sub division assignments
        // First, get existing assignments
        const existingResponse = await apiClient.getUsersSubDivisions({ user_id: userId, all: true })
        const existingSubDivisions = existingResponse.success && existingResponse.data
          ? (Array.isArray(existingResponse.data) ? existingResponse.data : existingResponse.data.userSubDivisions || [])
          : []
        const existingIds = existingSubDivisions.map((usd: any) => usd.sd_id)
        
        // Remove assignments that are no longer selected
        for (const existingId of existingIds) {
          if (!selectedSubDivisionIds.includes(existingId)) {
            const usd = existingSubDivisions.find((u: any) => u.sd_id === existingId)
            if (usd) {
              await apiClient.deleteUserSubDivision(usd.usd_id)
            }
          }
        }
        
        // Add new assignments
        for (const sdId of selectedSubDivisionIds) {
          if (!existingIds.includes(sdId)) {
            await apiClient.createUserSubDivision({ user_id: userId, sd_id: sdId })
          }
        }
        
        // Update department assignments
        // First, get existing assignments
        const existingDeptResponse = await apiClient.getUsersDepartments({ user_id: userId, all: true })
        const existingDepartments = existingDeptResponse.success && existingDeptResponse.data
          ? (Array.isArray(existingDeptResponse.data) ? existingDeptResponse.data : existingDeptResponse.data.userDepartments || [])
          : []
        const existingDeptIds = existingDepartments.map((ud: any) => ud.dept_id)
        
        // Remove assignments that are no longer selected
        for (const existingId of existingDeptIds) {
          if (!selectedDepartmentIds.includes(existingId)) {
            const ud = existingDepartments.find((u: any) => u.dept_id === existingId)
            if (ud) {
              await apiClient.deleteUserDepartment(ud.ud_id)
            }
          }
        }
        
        // Add new assignments
        for (const deptId of selectedDepartmentIds) {
          if (!existingDeptIds.includes(deptId)) {
            await apiClient.createUserDepartment({ user_id: userId, dept_id: deptId })
          }
        }
        
        // Fetch updated user data to refresh selectedUser with latest roles and other data
        try {
          const updatedUserResponse = await apiClient.getUser(userId)
          if (updatedUserResponse.success && updatedUserResponse.data) {
            setSelectedUser(updatedUserResponse.data)
          }
        } catch (error) {
          console.error('Failed to fetch updated user:', error)
          // Fallback: find updated user in filteredUsers after refresh
          // The users list will be refreshed by updateUser, so we can find it there
        }
        
        // Refetch user sub divisions and departments to ensure they're up to date
        // Only refetch if this is the currently selected user
        if (selectedUser?.id === userId) {
          await refetchUserSubDivisions()
          await refetchUserDepartments()
        }
        
        toast({
          title: 'User Updated',
          description: 'User has been updated successfully.',
          variant: 'success',
        })
      } else {
        setIsCreating(true)
        const createData: CreateUserData = {
          ...formData,
          email: formData.email?.trim() || undefined,
          p_num: formData.p_num?.trim() || undefined,
        }
        
        // Call API directly to get error message from response
        try {
          const response = await apiClient.createUser(createData)
          if (!response.success) {
            const errorMessage = response.message || response.error || 'Failed to create user. Please check your input and try again.'
            toast({
              title: 'Failed to Create User',
              description: errorMessage,
              variant: 'destructive',
            })
            return
          }
          // Creation was successful, get the user ID and refresh the list
          if (!response.data) {
            toast({
              title: 'Failed to Create User',
              description: 'User creation completed but no user data was returned. Please refresh the page.',
              variant: 'warning',
            })
            return
          }
          userId = response.data.id
          // Refresh the users list
          await refetchUsers()
        } catch (apiError: any) {
          const errorMessage = apiError?.message || apiError?.response?.data?.message || apiError?.response?.data?.error || 'Failed to create user. Please try again.'
          toast({
            title: 'Failed to Create User',
            description: errorMessage,
            variant: 'destructive',
          })
          return
        }
        
        // Create sub division assignments for new user
        try {
          for (const sdId of selectedSubDivisionIds) {
            await apiClient.createUserSubDivision({ user_id: userId, sd_id: sdId })
          }
        } catch (subDivError) {
          console.error('Failed to create sub division assignments:', subDivError)
          // Don't fail the whole operation, just log it
        }
        
        // Create department assignments for new user
        try {
          for (const deptId of selectedDepartmentIds) {
            await apiClient.createUserDepartment({ user_id: userId, dept_id: deptId })
          }
        } catch (deptError) {
          console.error('Failed to create department assignments:', deptError)
          // Don't fail the whole operation, just log it
        }
        
        // Show warning if any assignments failed
        if (selectedSubDivisionIds.length > 0 || selectedDepartmentIds.length > 0) {
          const hasSubDivErrors = selectedSubDivisionIds.length > 0
          const hasDeptErrors = selectedDepartmentIds.length > 0
          if (hasSubDivErrors || hasDeptErrors) {
            toast({
              title: 'User Created',
              description: 'User created successfully, but some assignments may have failed.',
              variant: 'warning',
            })
          }
        }
        
        toast({
          title: 'User Created',
          description: 'User has been created successfully.',
          variant: 'success',
        })
      }
      
      handleCloseDialog()
    } catch (error: any) {
      console.error('Failed to save user:', error)
      // Extract error message from various possible error formats
      let errorMessage = 'An unexpected error occurred. Please try again.'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (error?.message) {
        errorMessage = error.message
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      toast({
        title: editingUser ? 'Failed to Update User' : 'Failed to Create User',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
      setIsUpdating(false)
    }
  }

  const handleDelete = (user: User) => {
    // Prevent deleting user with ID 1
    if (user.id === 1) {
      return
    }
    setUserToDelete(user)
    setIsDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!userToDelete) return
    // Prevent deleting user with ID 1
    if (userToDelete.id === 1) {
      setIsDeleteConfirmOpen(false)
      setUserToDelete(null)
      return
    }
    try {
      setIsDeleting(true)
      
      // First, clear role assignments by updating user with empty role_ids
      try {
        await apiClient.updateUser(userToDelete.id, { role_ids: [] })
      } catch (error) {
        console.error('Failed to clear role assignments:', error)
        // Continue with deletion even if clearing roles fails
        // The backend might handle cascading deletes, but we try to clean up explicitly
      }
      
      // Second, delete all user sub-divisions associated with this user
      try {
        const userSubDivisionsResponse = await apiClient.getUsersSubDivisions({ 
          user_id: userToDelete.id, 
          all: true 
        })
        
        if (userSubDivisionsResponse.success && userSubDivisionsResponse.data) {
          const userSubDivisions = Array.isArray(userSubDivisionsResponse.data) 
            ? userSubDivisionsResponse.data 
            : userSubDivisionsResponse.data.userSubDivisions || []
          
          // Delete all user sub-divisions
          for (const usd of userSubDivisions) {
            if (usd.usd_id) {
              await apiClient.deleteUserSubDivision(usd.usd_id)
            }
          }
        }
      } catch (error) {
        console.error('Failed to delete user sub-divisions:', error)
        // Continue with user deletion even if sub-division deletion fails
        // The backend might handle cascading deletes, but we try to clean up explicitly
      }
      
      // Third, delete all user departments associated with this user
      try {
        const userDepartmentsResponse = await apiClient.getUsersDepartments({ 
          user_id: userToDelete.id, 
          all: true 
        })
        
        if (userDepartmentsResponse.success && userDepartmentsResponse.data) {
          const userDepartments = Array.isArray(userDepartmentsResponse.data) 
            ? userDepartmentsResponse.data 
            : userDepartmentsResponse.data.userDepartments || []
          
          // Delete all user departments
          for (const ud of userDepartments) {
            if (ud.ud_id) {
              await apiClient.deleteUserDepartment(ud.ud_id)
            }
          }
        }
      } catch (error) {
        console.error('Failed to delete user departments:', error)
        // Continue with user deletion even if department deletion fails
        // The backend might handle cascading deletes, but we try to clean up explicitly
      }
      
      // Finally, delete the user
      await deleteUser(userToDelete.id)
      setIsDeleteConfirmOpen(false)
      setUserToDelete(null)
    } catch (error) {
      console.error('Failed to delete user:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Build hierarchical data for sub division selection in dialog
  const dialogSubDivisionData = useMemo(() => {
    if (!circles.length || !divisions.length || !subDivisions.length) return []
    
    return circles.map(circle => {
      const circleDivisions = divisions.filter(d => d.circle_id === circle.id)
      
      const divisionsWithSubDivisions = circleDivisions.map(division => {
        const divisionSubDivisions = subDivisions.filter(sd => sd.division_id === division.id)
        
        return {
          division,
          subDivisions: divisionSubDivisions.map(sd => ({
            subDivision: sd,
            isSelected: selectedSubDivisionIds.includes(sd.id)
          }))
        }
      }).filter(d => d.subDivisions.length > 0)
      
      return {
        circle,
        divisions: divisionsWithSubDivisions
      }
    }).filter(c => c.divisions.length > 0)
  }, [circles, divisions, subDivisions, selectedSubDivisionIds])
  
  const handleSubDivisionToggle = (subDivisionId: number) => {
    setSelectedSubDivisionIds(prev => {
      if (prev.includes(subDivisionId)) {
        return prev.filter(id => id !== subDivisionId)
      } else {
        return [...prev, subDivisionId]
      }
    })
  }
  
  // Helper functions for dialog circle/division selection
  const isAllSubDivisionsSelectedForCircleInDialog = (circleId: number) => {
    const circleData = dialogSubDivisionData.find(c => c.circle.id === circleId)
    if (!circleData) return false
    return circleData.divisions.every(div => 
      div.subDivisions.every(sd => selectedSubDivisionIds.includes(sd.subDivision.id))
    )
  }
  
  const handleSelectAllForCircleInDialog = (circleId: number, checked: boolean) => {
    const circleData = dialogSubDivisionData.find(c => c.circle.id === circleId)
    if (!circleData) return
    
    const allSubDivisionIds: number[] = []
    circleData.divisions.forEach(div => {
      div.subDivisions.forEach(sd => {
        allSubDivisionIds.push(sd.subDivision.id)
      })
    })
    
    setSelectedSubDivisionIds(prev => {
      if (checked) {
        // Add all sub divisions from this circle
        const newIds = [...prev]
        allSubDivisionIds.forEach(id => {
          if (!newIds.includes(id)) {
            newIds.push(id)
          }
        })
        return newIds
      } else {
        // Remove all sub divisions from this circle
        return prev.filter(id => !allSubDivisionIds.includes(id))
      }
    })
  }
  
  const isAllSubDivisionsSelectedForDivisionInDialog = (circleId: number, divisionId: number) => {
    const circleData = dialogSubDivisionData.find(c => c.circle.id === circleId)
    if (!circleData) return false
    const divisionData = circleData.divisions.find(d => d.division.id === divisionId)
    if (!divisionData) return false
    return divisionData.subDivisions.every(sd => selectedSubDivisionIds.includes(sd.subDivision.id))
  }
  
  const handleSelectAllForDivisionInDialog = (circleId: number, divisionId: number, checked: boolean) => {
    const circleData = dialogSubDivisionData.find(c => c.circle.id === circleId)
    if (!circleData) return
    const divisionData = circleData.divisions.find(d => d.division.id === divisionId)
    if (!divisionData) return
    
    const allSubDivisionIds = divisionData.subDivisions.map(sd => sd.subDivision.id)
    
    setSelectedSubDivisionIds(prev => {
      if (checked) {
        // Add all sub divisions from this division
        const newIds = [...prev]
        allSubDivisionIds.forEach(id => {
          if (!newIds.includes(id)) {
            newIds.push(id)
          }
        })
        return newIds
      } else {
        // Remove all sub divisions from this division
        return prev.filter(id => !allSubDivisionIds.includes(id))
      }
    })
  }

  // Get roles for selected user - MUST be before any early returns
  const selectedUserRoles = useMemo(() => {
    if (!selectedUser) return []
    return selectedUser.roles || []
  }, [selectedUser])

  // Get sub divisions already assigned to the user
  const assignedSubDivisionIds = useMemo(() => {
    return userSubDivisions.map(usd => usd.sd_id)
  }, [userSubDivisions])

  // Get departments already assigned to the user
  const assignedDepartmentIds = useMemo(() => {
    return userDepartments.map(ud => ud.dept_id)
  }, [userDepartments])


  // Build hierarchical grid data structure: Circle -> Division -> Sub Division
  const hierarchicalGridData = useMemo(() => {
    if (!circles.length || !divisions.length || !subDivisions.length) return []
    
    return circles.map(circle => {
      const circleDivisions = divisions.filter(d => d.circle_id === circle.id)
      
      const divisionsWithSubDivisions = circleDivisions.map(division => {
        const divisionSubDivisions = subDivisions.filter(sd => sd.division_id === division.id)
        
        return {
          division,
          subDivisions: divisionSubDivisions.map(sd => {
            const isAssigned = assignedSubDivisionIds.includes(sd.id)
            const pendingValue = pendingSubDivisionChanges.get(sd.id)
            const isChecked = pendingValue !== undefined ? pendingValue : isAssigned
            
            return {
              subDivision: sd,
              isAssigned,
              isChecked,
              usdId: userSubDivisions.find(usd => usd.sd_id === sd.id)?.usd_id
            }
          })
        }
      }).filter(d => d.subDivisions.length > 0) // Only include divisions that have sub-divisions
      
      return {
        circle,
        divisions: divisionsWithSubDivisions
      }
    }).filter(c => c.divisions.length > 0) // Only include circles that have divisions with sub-divisions
  }, [circles, divisions, subDivisions, assignedSubDivisionIds, pendingSubDivisionChanges, userSubDivisions])

  // Check if there are pending changes
  const hasPendingSubDivisionChanges = useMemo(() => {
    return pendingSubDivisionChanges.size > 0
  }, [pendingSubDivisionChanges])

  // Handle sub-division checkbox change
  const handleSubDivisionChange = (subDivisionId: number, checked: boolean) => {
    if (!selectedUser) return
    
    setPendingSubDivisionChanges(prev => {
      const newMap = new Map(prev)
      const isCurrentlyAssigned = assignedSubDivisionIds.includes(subDivisionId)
      
      // If the new state matches the original state, remove from pending changes
      if (checked === isCurrentlyAssigned) {
        newMap.delete(subDivisionId)
      } else {
        newMap.set(subDivisionId, checked)
      }
      
      return newMap
    })
  }

  // Handle discard changes
  const handleDiscardSubDivisionChanges = () => {
    setPendingSubDivisionChanges(new Map())
  }

  // Handle save changes
  const handleSaveSubDivisionChanges = async () => {
    if (!selectedUser || pendingSubDivisionChanges.size === 0) return
    
    try {
      setIsSavingSubDivisions(true)
      
      // Process all pending changes
      for (const [subDivisionId, checked] of pendingSubDivisionChanges.entries()) {
        const isCurrentlyAssigned = assignedSubDivisionIds.includes(subDivisionId)
        const existingUsd = userSubDivisions.find(usd => usd.sd_id === subDivisionId)
        
        if (checked && !isCurrentlyAssigned) {
          // Create new assignment
          await createUserSubDivision({
            user_id: selectedUser.id,
            sd_id: subDivisionId
          })
        } else if (!checked && isCurrentlyAssigned && existingUsd) {
          // Delete existing assignment
          await deleteUserSubDivision(existingUsd.usd_id)
        }
      }
      
      // Clear pending changes
      setPendingSubDivisionChanges(new Map())
      
      // Refetch to get updated data - keep loading state true until this completes
      await refetchUserSubDivisions()
    } catch (error) {
      console.error('Failed to save sub-division changes:', error)
    } finally {
      // Only hide loading when all operations (including refetch) are complete
      setIsSavingSubDivisions(false)
    }
  }

  // Reset pending changes when user changes
  useEffect(() => {
    setPendingSubDivisionChanges(new Map())
    setPendingDepartmentChanges(new Map())
  }, [selectedUser?.id])
  
  // Sync selectedUser with updated data from filteredUsers when users list refreshes
  useEffect(() => {
    if (selectedUser && filteredUsers.length > 0) {
      const updatedUser = filteredUsers.find(u => u.id === selectedUser.id)
      if (updatedUser) {
        // Only update if the user data has actually changed (e.g., roles updated)
        const rolesChanged = JSON.stringify(updatedUser.roles || []) !== JSON.stringify(selectedUser.roles || [])
        const usernameChanged = updatedUser.username !== selectedUser.username
        const isActiveChanged = updatedUser.is_active !== selectedUser.is_active
        
        if (rolesChanged || usernameChanged || isActiveChanged) {
          setSelectedUser(updatedUser)
        }
      }
    }
  }, [filteredUsers])

  // Helper functions for column-level select all
  const isAllSubDivisionsSelectedForCircle = (circleId: number) => {
    const circleData = hierarchicalGridData.find(c => c.circle.id === circleId)
    if (!circleData) return false
    return circleData.divisions.every(div => 
      div.subDivisions.every(sd => sd.isChecked)
    )
  }

  const handleSelectAllForCircle = (circleId: number, checked: boolean) => {
    const circleData = hierarchicalGridData.find(c => c.circle.id === circleId)
    if (!circleData) return
    circleData.divisions.forEach(div => {
      div.subDivisions.forEach(sd => {
        handleSubDivisionChange(sd.subDivision.id, checked)
      })
    })
  }

  const isAllSubDivisionsSelectedForDivision = (circleId: number, divisionId: number) => {
    const circleData = hierarchicalGridData.find(c => c.circle.id === circleId)
    if (!circleData) return false
    const divisionData = circleData.divisions.find(d => d.division.id === divisionId)
    if (!divisionData) return false
    return divisionData.subDivisions.every(sd => sd.isChecked)
  }

  const handleSelectAllForDivision = (circleId: number, divisionId: number, checked: boolean) => {
    const circleData = hierarchicalGridData.find(c => c.circle.id === circleId)
    if (!circleData) return
    const divisionData = circleData.divisions.find(d => d.division.id === divisionId)
    if (!divisionData) return
    divisionData.subDivisions.forEach(sd => {
      handleSubDivisionChange(sd.subDivision.id, checked)
    })
  }

  const handleDeleteSubDivision = (usdId: number) => {
    setSubDivisionToDelete(usdId)
    setIsDeleteSubDivisionDialogOpen(true)
  }

  const handleConfirmDeleteSubDivision = async () => {
    if (!subDivisionToDelete) return
    try {
      setIsDeletingSubDivision(true)
      await deleteUserSubDivision(subDivisionToDelete)
      await refetchUserSubDivisions()
      setIsDeleteSubDivisionDialogOpen(false)
      setSubDivisionToDelete(null)
    } catch (error) {
      console.error('Failed to delete user sub division:', error)
    } finally {
      setIsDeletingSubDivision(false)
    }
  }

  // Check if there are pending department changes
  const hasPendingDepartmentChanges = useMemo(() => {
    return pendingDepartmentChanges.size > 0
  }, [pendingDepartmentChanges])

  // Handle department checkbox change
  const handleDepartmentChange = (departmentId: number, checked: boolean) => {
    if (!selectedUser) return
    
    setPendingDepartmentChanges(prev => {
      const newMap = new Map(prev)
      const isCurrentlyAssigned = assignedDepartmentIds.includes(departmentId)
      
      // If the new state matches the original state, remove from pending changes
      if (checked === isCurrentlyAssigned) {
        newMap.delete(departmentId)
      } else {
        newMap.set(departmentId, checked)
      }
      
      return newMap
    })
  }

  // Handle discard department changes
  const handleDiscardDepartmentChanges = () => {
    setPendingDepartmentChanges(new Map())
  }

  // Handle save department changes
  const handleSaveDepartmentChanges = async () => {
    if (!selectedUser || pendingDepartmentChanges.size === 0) return
    
    try {
      setIsSavingDepartments(true)
      
      // Process all pending changes
      for (const [departmentId, checked] of pendingDepartmentChanges.entries()) {
        const isCurrentlyAssigned = assignedDepartmentIds.includes(departmentId)
        const existingUd = userDepartments.find(ud => ud.dept_id === departmentId)
        
        if (checked && !isCurrentlyAssigned) {
          // Create new assignment
          await createUserDepartment({
            user_id: selectedUser.id,
            dept_id: departmentId
          })
        } else if (!checked && isCurrentlyAssigned && existingUd) {
          // Remove assignment
          await deleteUserDepartment(existingUd.ud_id)
        }
      }
      
      // Clear pending changes
      setPendingDepartmentChanges(new Map())
      
      // Refetch to ensure UI is up to date
      await refetchUserDepartments()
    } catch (error) {
      console.error('Failed to save department changes:', error)
    } finally {
      setIsSavingDepartments(false)
    }
  }

  if (loading && currentPage === 1) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-gray-500" />
          <span className="text-gray-500 dark:text-gray-400">Loading users...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative -mx-6 px-6" style={{ height: 'calc(100vh - 7rem)' }}>
      <div className="flex h-full gap-6 w-full min-w-[1000px]">
        {/* Left Sidebar - Users List */}
        <div className="w-70 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-800 h-full">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage user accounts and permissions</p>
              </div>
              <Button onClick={() => handleOpenDialog()} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="mb-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white h-9"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            
            {/* <Button variant="outline" size="sm" onClick={() => setIsFilterDialogOpen(true)} className="w-full">
              <Filter className="mr-2 h-4 w-4" />
              Advanced Filters
            </Button> */}

            {hasActiveFilters && (
              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Filters</span>
                  <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-6 px-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                    Clear
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {searchTerm && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                      <Search className="h-3 w-3" />
                      <span>"{searchTerm}"</span>
                      <button onClick={() => setSearchTerm('')} className="ml-1 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {statusFilter !== 'all' && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                      <CheckCircle className="h-3 w-3" />
                      <span>{statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</span>
                      <button onClick={() => setStatusFilter('all')} className="ml-1 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {filterModel.items.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-1">
                      {index > 0 && (
                        <span className={`px-1 py-0.5 rounded text-xs font-medium ${
                          filterModel.logicOperator === 'and' ? 'bg-orange-200 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' : 'bg-pink-200 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300'
                        }`}>
                          {filterModel.logicOperator.toUpperCase()}
                        </span>
                      )}
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full">
                        <Filter className="h-3 w-3" />
                        <span className="truncate max-w-[120px]">{item.field.replace('_', ' ')} {getOperatorDisplay(item.operator)}</span>
                        <button
                          onClick={() => setFilterModel(prev => ({ ...prev, items: prev.items.filter(f => f.id !== item.id) }))}
                          className="ml-1 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            {error && (
              <div className="m-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {loading && currentPage === 1 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin mb-2 text-gray-400 dark:text-gray-500" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No users found</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{hasActiveFilters ? 'Try adjusting your filters' : 'Get started by adding your first user'}</p>
              </div>
            ) : (
              <div className="p-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-all mb-2 border",
                      selectedUser?.id === user.id
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-sm"
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">{user.username}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {user.sap_code && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">SAP Code:</span>
                              <span>{user.sap_code}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {user.roles?.map(r => r.role_name).join(', ') || 'No roles'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">ID: {user.id}</div>
                      </div>
                      {user.id !== 1 && (
                        <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDuplicateUser(user)} 
                            className="h-6 w-6 p-0"
                            title="Duplicate user"
                          >
                            <Copy className="h-3 w-3 text-blue-600" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleOpenDialog(user)} 
                            className="h-6 w-6 p-0"
                            title="Edit user"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(user)} 
                            className="h-6 w-6 p-0"
                            title="Delete user"
                          >
                            <Trash2 className="h-3 w-3 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area - Master and Detail Tables */}
        <div className="flex-1 min-w-0 overflow-y-auto w-full custom-scrollbar">
            {selectedUser ? (
              <div className="space-y-6 w-full p-6">
              {/* Master Info */}
              <div className="rounded-md border border-gray-200 dark:border-gray-800 bg-transparent shadow-none p-4 w-full">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">User</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedUser.username}</p>
                  </div>
                  {selectedUser.id !== 1 && (
                    <Button 
                      onClick={() => handleOpenDialog(selectedUser)} 
                      size="sm" 
                      variant="outline"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-42">
                      <Hash className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">ID</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedUser.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-42">
                      <Calendar className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Created</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{formatDate(selectedUser.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-42">
                      <UserIcon className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Username</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedUser.username}</span>
                  </div>
                  {selectedUser.full_name && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 w-42">
                        <UserIcon className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                        <span className="text-gray-500 dark:text-gray-400">Full Name</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedUser.full_name}</span>
                    </div>
                  )}
                  {selectedUser.sap_code && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 w-42">
                        <Tag className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                        <span className="text-gray-500 dark:text-gray-400">SAP Code</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedUser.sap_code}</span>
                    </div>
                  )}
                  {selectedUser.email && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 w-42">
                        <Mail className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                        <span className="text-gray-500 dark:text-gray-400">Email</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedUser.email}</span>
                    </div>
                  )}
                  {selectedUser.p_num && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 w-42">
                        <Phone className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                        <span className="text-gray-500 dark:text-gray-400">Phone Number</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedUser.p_num}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-42">
                      <CheckCircle className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Status</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedUser.is_active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {selectedUser.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="flex items-center gap-1.5 w-42 flex-shrink-0">
                      <Building className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Departments</span>
                    </div>
                    <div className="flex flex-wrap gap-2 flex-1">
                      {(() => {
                        // Get all unique department IDs (current + pending additions)
                        const allDeptIds = new Set<number>()
                        assignedDepartmentIds.forEach(id => allDeptIds.add(id))
                        pendingDepartmentChanges.forEach((checked, deptId) => {
                          if (checked) allDeptIds.add(deptId)
                        })
                        
                        // Get all departments to display
                        const deptsToShow = Array.from(allDeptIds)
                          .map(deptId => {
                            const ud = userDepartments.find(ud => ud.dept_id === deptId)
                            const dept = ud?.department || departments.find(d => d.dept_id === deptId)
                            if (!dept) return null
                            
                            const hasPendingChange = pendingDepartmentChanges.has(deptId)
                            const pendingValue = pendingDepartmentChanges.get(deptId)
                            const isCurrentlyAssigned = assignedDepartmentIds.includes(deptId)
                            const willBeAssigned = pendingValue !== undefined ? pendingValue : isCurrentlyAssigned
                            
                            return {
                              deptId,
                              name: dept.name,
                              hasPendingChange,
                              willBeAssigned
                            }
                          })
                          .filter((d): d is NonNullable<typeof d> => d !== null && d.willBeAssigned)
                        
                        if (deptsToShow.length === 0) {
                          return <span className="text-gray-500 dark:text-gray-400">N/A</span>
                        }
                        
                        return deptsToShow.map(({ deptId, name, hasPendingChange }) => (
                          <span
                            key={deptId}
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              hasPendingChange
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {name}
                            {hasPendingChange && (
                              <span className="ml-1 text-blue-600 dark:text-blue-400">*</span>
                            )}
                          </span>
                        ))
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-42">
                      <Shield className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Total Roles</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedUserRoles.length}</span>
                  </div>
                </div>
              </div>

              {/* Detail Table - User Roles */}
              <Card className="w-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Assigned Roles</CardTitle>
                      <CardDescription>Roles assigned to this user</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role Name</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedUserRoles.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center py-12">
                            <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">No roles assigned</p>
                            <p className="text-gray-500 dark:text-gray-400">Edit the user to assign roles</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedUserRoles.map((role) => (
                          <TableRow key={role.role_id}>
                            <TableCell className="font-medium text-gray-900 dark:text-white">{role.role_name}</TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300">
                              {role.created_at ? formatDate(role.created_at) : 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Interactive Grid - User Sub Divisions */}
              <Card className="w-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Allowed Sub Divisions</CardTitle>
                      <CardDescription>Manage sub-division access for this user</CardDescription>
                    </div>
                    {hasPendingSubDivisionChanges && (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleDiscardSubDivisionChanges} disabled={isSavingSubDivisions}>
                          Discard
                        </Button>
                        <Button onClick={handleSaveSubDivisionChanges} disabled={isSavingSubDivisions}>
                          {isSavingSubDivisions ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save Changes'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {userSubDivisionsError && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                      <p className="text-red-600 dark:text-red-400">{userSubDivisionsError}</p>
                    </div>
                  )}
                  
                  {userSubDivisionsLoading && !isSavingSubDivisions ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading sub divisions...</p>
                    </div>
                  ) : isSavingSubDivisions ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Saving changes...</p>
                    </div>
                  ) : hierarchicalGridData.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">No sub divisions available</p>
                      <p className="text-gray-500 dark:text-gray-400">Sub divisions will appear here once they are added to the system</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-center min-w-[100px]"></TableHead>
                            <TableHead className="min-w-[200px]">Circle</TableHead>
                            <TableHead className="min-w-[200px]">Division</TableHead>
                            <TableHead className="min-w-[200px]">Sub Division</TableHead>
                            <TableHead className="text-right min-w-[100px]"></TableHead>
                          </TableRow>
                          <TableRow>
                            <TableHead className="text-center min-w-[100px]">
                              <div className="flex justify-center items-center">
                                <Checkbox
                                  checked={hierarchicalGridData.length > 0 && hierarchicalGridData.every(circle => 
                                    circle.divisions.every(div => 
                                      div.subDivisions.every(sd => sd.isChecked)
                                    )
                                  )}
                                  onChange={(checked) => {
                                    hierarchicalGridData.forEach(circle => {
                                      circle.divisions.forEach(div => {
                                        div.subDivisions.forEach(sd => {
                                          handleSubDivisionChange(sd.subDivision.id, checked)
                                        })
                                      })
                                    })
                                  }}
                                />
                              </div>
                            </TableHead>
                            <TableHead className="min-w-[200px]"></TableHead>
                            <TableHead className="min-w-[200px]"></TableHead>
                            <TableHead className="min-w-[200px]"></TableHead>
                            <TableHead className="text-right min-w-[100px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {hierarchicalGridData.map((circleData) => {
                            let isFirstCircleRow = true
                            return circleData.divisions.map((divisionData) => {
                              let isFirstDivisionRow = true
                              return divisionData.subDivisions.map((sdData) => {
                                const hasChange = pendingSubDivisionChanges.has(sdData.subDivision.id)
                                const showCircle = isFirstCircleRow
                                const showDivision = isFirstDivisionRow
                                
                                if (isFirstCircleRow) isFirstCircleRow = false
                                if (isFirstDivisionRow) isFirstDivisionRow = false
                                
                                return (
                                  <TableRow 
                                    key={`${circleData.circle.id}-${divisionData.division.id}-${sdData.subDivision.id}`}
                                    className={hasChange ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}
                                  >
                                    <TableCell className="text-center">
                                      <div className="flex justify-center items-center">
                                        <Checkbox
                                          checked={sdData.isChecked}
                                          onChange={(checked) => handleSubDivisionChange(sdData.subDivision.id, checked)}
                                        />
                                      </div>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                      {showCircle ? (
                                        <div className="flex items-center gap-2">
                                          <div className="flex justify-center items-center">
                                            <Checkbox
                                              checked={isAllSubDivisionsSelectedForCircle(circleData.circle.id)}
                                              onChange={(checked) => handleSelectAllForCircle(circleData.circle.id, checked)}
                                            />
                                          </div>
                                          <span className="font-semibold text-gray-900 dark:text-white">
                                            {circleData.circle.name}
                                          </span>
                                        </div>
                                      ) : null}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                      {showDivision ? (
                                        <div className="flex items-center gap-2">
                                          <div className="flex justify-center items-center">
                                            <Checkbox
                                              checked={isAllSubDivisionsSelectedForDivision(circleData.circle.id, divisionData.division.id)}
                                              onChange={(checked) => handleSelectAllForDivision(circleData.circle.id, divisionData.division.id, checked)}
                                            />
                                          </div>
                                          <span className="text-gray-900 dark:text-white pl-4">
                                            {divisionData.division.name}
                                          </span>
                                        </div>
                                      ) : null}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                      <div className="flex items-center gap-2">
                                        <div className="flex justify-center items-center">
                                          <Checkbox
                                            checked={sdData.isChecked}
                                            onChange={(checked) => handleSubDivisionChange(sdData.subDivision.id, checked)}
                                          />
                                        </div>
                                        <span className="pl-2">{sdData.subDivision.name}</span>
                                        {hasChange && (
                                          <span className="text-xs text-blue-600 dark:text-blue-400">(modified)</span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {sdData.isAssigned && sdData.usdId && !pendingSubDivisionChanges.has(sdData.subDivision.id) && (
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          onClick={() => {
                                            const usd = userSubDivisions.find(u => u.usd_id === sdData.usdId)
                                            if (usd) handleDeleteSubDivision(usd.usd_id)
                                          }}
                                        >
                                          <X className="h-4 w-4 text-red-600" />
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                )
                              })
                            })
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Departments Management */}
              <Card className="w-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Assigned Departments</CardTitle>
                      <CardDescription>Manage department access for this user</CardDescription>
                    </div>
                    {hasPendingDepartmentChanges && (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleDiscardDepartmentChanges} disabled={isSavingDepartments}>
                          Discard
                        </Button>
                        <Button onClick={handleSaveDepartmentChanges} disabled={isSavingDepartments}>
                          {isSavingDepartments ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save Changes'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {userDepartmentsError && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                      <p className="text-red-600 dark:text-red-400">{userDepartmentsError}</p>
                    </div>
                  )}
                  
                  {userDepartmentsLoading && !isSavingDepartments ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading departments...</p>
                    </div>
                  ) : isSavingDepartments ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Saving changes...</p>
                    </div>
                  ) : departments.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">No departments available</p>
                      <p className="text-gray-500 dark:text-gray-400">Departments will appear here once they are added to the system</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-center min-w-[100px]"></TableHead>
                            <TableHead className="min-w-[200px]">Department</TableHead>
                            <TableHead className="text-right min-w-[100px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {departments.filter(dept => dept?.dept_id).map((dept) => {
                            const isAssigned = assignedDepartmentIds.includes(dept.dept_id)
                            const pendingValue = pendingDepartmentChanges.get(dept.dept_id)
                            const isChecked = pendingValue !== undefined ? pendingValue : isAssigned
                            const hasChange = pendingDepartmentChanges.has(dept.dept_id)
                            const ud = userDepartments.find(ud => ud.dept_id === dept.dept_id)
                            
                            return (
                              <TableRow 
                                key={dept.dept_id}
                                className={hasChange ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}
                              >
                                <TableCell className="text-center">
                                  <div className="flex justify-center items-center">
                                    <Checkbox
                                      checked={isChecked}
                                      onChange={(checked) => handleDepartmentChange(dept.dept_id, checked)}
                                    />
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium text-gray-900 dark:text-white">
                                  <div className="flex items-center gap-2">
                                    <span>{dept.name}</span>
                                    {hasChange && (
                                      <span className="text-xs text-blue-600 dark:text-blue-400">(modified)</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {isAssigned && ud?.ud_id && !pendingDepartmentChanges.has(dept.dept_id) && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => {
                                        if (ud?.ud_id) {
                                          handleDepartmentChange(dept.dept_id, false)
                                        }
                                      }}
                                    >
                                      <X className="h-4 w-4 text-red-600" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Layers className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No User Selected</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Select a user from the list to view their details</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>
          )}
        </div>


      <AdvancedFilterDialog
        isOpen={isFilterDialogOpen}
        onClose={() => setIsFilterDialogOpen(false)}
        onApplyFilters={() => {}}
        filterModel={filterModel}
        onFilterModelChange={setFilterModel}
        fields={userFilterFields}
        getOperatorsForField={getUserOperatorsForField}
        getValueInput={getUserValueInput}
      />

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open && (isCreating || isUpdating)) return
        setIsDialogOpen(open)
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update user information' : 'Create a new user account'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Username and Password Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username <span className="text-red-500">*</span></Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => {
                    setFormData({ ...formData, username: e.target.value })
                    if (errors.username) {
                      setErrors({ ...errors, username: undefined })
                    }
                  }}
                  className={errors.username ? 'border-red-500' : ''}
                  required
                />
                {errors.username && (
                  <p className="text-sm text-red-500">{errors.username}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password {editingUser && '(leave blank to keep current)'} {!editingUser && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value })
                    if (errors.password) {
                      setErrors({ ...errors, password: undefined })
                    }
                  }}
                  className={errors.password ? 'border-red-500' : ''}
                  required={!editingUser}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>
            </div>
            
            {/* Full Name and SAP Code Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name <span className="text-red-500">*</span></Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => {
                    setFormData({ ...formData, full_name: e.target.value })
                    if (errors.full_name) {
                      setErrors({ ...errors, full_name: undefined })
                    }
                  }}
                  className={errors.full_name ? 'border-red-500' : ''}
                  required
                />
                {errors.full_name && (
                  <p className="text-sm text-red-500">{errors.full_name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sap_code">SAP Code <span className="text-red-500">*</span></Label>
                <Input
                  id="sap_code"
                  type="number"
                  value={formData.sap_code || ''}
                  onChange={(e) => {
                    const value = e.target.value
                    setFormData({ 
                      ...formData, 
                      sap_code: value === '' ? undefined : parseInt(value, 10) 
                    })
                    if (errors.sap_code) {
                      setErrors({ ...errors, sap_code: undefined })
                    }
                  }}
                  className={errors.sap_code ? 'border-red-500' : ''}
                  required
                  min="1"
                />
                {errors.sap_code && (
                  <p className="text-sm text-red-500">{errors.sap_code}</p>
                )}
              </div>
            </div>
            
            {/* Email and Phone Number Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value })
                    if (errors.email) {
                      setErrors({ ...errors, email: undefined })
                    }
                  }}
                  onBlur={() => {
                    // Validate email on blur for better UX
                    if (formData.email && formData.email.trim()) {
                      const trimmedEmail = formData.email.trim()
                      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
                      if (trimmedEmail.length > 255) {
                        setErrors({ ...errors, email: 'Email must be less than 255 characters' })
                      } else if (!emailRegex.test(trimmedEmail)) {
                        setErrors({ ...errors, email: 'Please enter a valid email address (e.g., user@example.com)' })
                      }
                    }
                  }}
                  className={errors.email ? 'border-red-500' : ''}
                  placeholder="user@example.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="p_num">Phone Number</Label>
                <Input
                  id="p_num"
                  type="tel"
                  value={formData.p_num}
                  onChange={(e) => {
                    // Only allow numeric input
                    const value = e.target.value.replace(/\D/g, '')
                    setFormData({ ...formData, p_num: value })
                    if (errors.p_num) {
                      setErrors({ ...errors, p_num: undefined })
                    }
                  }}
                  className={errors.p_num ? 'border-red-500' : ''}
                  placeholder="03012345678"
                  maxLength={100}
                />
                {errors.p_num && (
                  <p className="text-sm text-red-500">{errors.p_num}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="departments">Departments</Label>
              <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar border border-gray-200 dark:border-gray-800 rounded-md p-3 bg-gray-50 dark:bg-white/[0.03]">
                {departmentsLoading ? (
                  <div className="p-2 text-sm text-gray-500">Loading departments...</div>
                ) : departmentsError ? (
                  <div className="p-2 text-sm text-red-500">Error: {departmentsError}</div>
                ) : departments.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500">No departments available</div>
                ) : (
                  departments.filter(dept => dept?.dept_id).map((dept) => (
                    <Checkbox
                      key={dept.dept_id}
                      id={`dept-${dept.dept_id}`}
                      label={dept.name}
                      checked={selectedDepartmentIds.includes(dept.dept_id)}
                      onChange={(checked) => {
                        if (checked) {
                          setSelectedDepartmentIds([...selectedDepartmentIds, dept.dept_id])
                        } else {
                          setSelectedDepartmentIds(selectedDepartmentIds.filter(id => id !== dept.dept_id))
                        }
                        if (errors.department_id) {
                          setErrors({ ...errors, department_id: undefined })
                        }
                      }}
                    />
                  ))
                )}
              </div>
              {errors.department_id && (
                <p className="text-sm text-red-500">{errors.department_id}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="roles">Roles <span className="text-red-500">*</span></Label>
              <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar border border-gray-200 dark:border-gray-800 rounded-md p-3 bg-gray-50 dark:bg-white/[0.03]">
                {roles.filter(role => role?.id).map((role) => (
                  <Checkbox
                    key={role.id}
                    id={`role-${role.id}`}
                    label={role.name}
                    checked={formData.role_ids.includes(role.id)}
                    onChange={(checked) => {
                      if (checked) {
                        setFormData({ ...formData, role_ids: [...formData.role_ids, role.id] })
                      } else {
                        setFormData({ ...formData, role_ids: formData.role_ids.filter(id => id !== role.id) })
                      }
                      if (errors.role_ids) {
                        setErrors({ ...errors, role_ids: undefined })
                      }
                    }}
                  />
                ))}
              </div>
              {errors.role_ids && (
                <p className="text-sm text-red-500">{errors.role_ids}</p>
              )}
            </div>
            {/* Sub Division Assignments */}
            <div className="space-y-2">
              <Label>Sub Division Access (Optional)</Label>
              <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar border border-gray-200 dark:border-gray-800 rounded-md p-3 bg-gray-50 dark:bg-white/[0.03]">
                {dialogSubDivisionData.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No sub divisions available
                  </p>
                ) : (
                  dialogSubDivisionData.map((circleData) => (
                    <div key={circleData.circle.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isAllSubDivisionsSelectedForCircleInDialog(circleData.circle.id)}
                          onChange={(checked) => handleSelectAllForCircleInDialog(circleData.circle.id, checked)}
                        />
                        <span className="font-semibold text-sm text-gray-900 dark:text-white">
                          {circleData.circle.name}
                        </span>
                      </div>
                      {circleData.divisions.map((divisionData) => (
                        <div key={divisionData.division.id} className="pl-4 space-y-1">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={isAllSubDivisionsSelectedForDivisionInDialog(circleData.circle.id, divisionData.division.id)}
                              onChange={(checked) => handleSelectAllForDivisionInDialog(circleData.circle.id, divisionData.division.id, checked)}
                            />
                            <span className="font-medium text-xs text-gray-700 dark:text-gray-300">
                              {divisionData.division.name}
                            </span>
                          </div>
                          <div className="pl-4 space-y-1">
                            {divisionData.subDivisions.map((sdData) => (
                              <div key={sdData.subDivision.id} className="flex items-center gap-2">
                                <Checkbox
                                  checked={sdData.isSelected}
                                  onChange={(checked) => handleSubDivisionToggle(sdData.subDivision.id)}
                                />
                                <span className="text-sm text-gray-900 dark:text-white">
                                  {sdData.subDivision.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isCreating || isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingUser ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingUser ? 'Update' : 'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={(open) => {
        if (!open && isDeleting) return
        setIsDeleteConfirmOpen(open)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{userToDelete?.username}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDeleteConfirmOpen(false)
              setUserToDelete(null)
            }} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Delete Sub Division Confirmation Dialog */}
      <Dialog open={isDeleteSubDivisionDialogOpen} onOpenChange={(open) => {
        if (!open && isDeletingSubDivision) return
        setIsDeleteSubDivisionDialogOpen(open)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Sub Division Access</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this sub division access from <strong>{selectedUser?.username}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDeleteSubDivisionDialogOpen(false)
              setSubDivisionToDelete(null)
            }} disabled={isDeletingSubDivision}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteSubDivision}
              disabled={isDeletingSubDivision}
            >
              {isDeletingSubDivision ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Access'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
