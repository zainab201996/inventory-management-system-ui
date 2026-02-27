'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useRoles } from '@/hooks/use-roles'
import { useRoleDetails } from '@/hooks/use-role-details'
import { usePages } from '@/hooks/use-pages'
import { formatDate, cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import { Role, RoleDetail } from '@/types'
import { Search, Plus, Edit, Loader2, Filter, X, ArrowUp, ArrowDown, ArrowUpDown, Layers, Hash, Calendar, Shield, Copy } from 'lucide-react'
import { AdvancedFilterDialog, FilterField, FilterOperator } from '@/components/ui/advanced-filter-dialog'
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
import Checkbox from '@/components/ui/checkbox'

const roleFilterFields: FilterField[] = [
  { value: 'name', label: 'Name', type: 'text' },
  { value: 'created_at', label: 'Created Date', type: 'date' }
]

const getRoleOperatorsForField = (field: string): FilterOperator[] => {
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
    default:
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

export function RolesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterModel, setFilterModel] = useState({
    items: [] as Array<{ id: number; field: string; operator: string; value: any }>,
    logicOperator: 'and' as 'and' | 'or'
  })
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [roleToDuplicate, setRoleToDuplicate] = useState<Role | null>(null) // Store role to duplicate permissions from
  const [formData, setFormData] = useState({ role_name: '' })
  const [errors, setErrors] = useState<{ role_name?: string }>({})
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Master-Detail state
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [editingDetail, setEditingDetail] = useState<RoleDetail | null>(null)
  const [detailFormData, setDetailFormData] = useState({ 
    page_id: 0, 
    report_id: 0, 
    action_id: 0, 
    show: false, 
    create: false, 
    edit: false, 
    delete: false 
  })
  const [detailErrors, setDetailErrors] = useState<{ page_id?: string; report_id?: string; action_id?: string }>({})
  const [activeTab, setActiveTab] = useState<'pages' | 'reports' | 'actions'>('pages')
  const [isCreatingDetail, setIsCreatingDetail] = useState(false)
  const [isUpdatingDetail, setIsUpdatingDetail] = useState(false)
  
  // Pending changes for grid UI
  const [pendingChanges, setPendingChanges] = useState<Map<number, { show: boolean; create: boolean; edit: boolean; delete: boolean }>>(new Map())
  const [isSaving, setIsSaving] = useState(false)
  
  // Delete confirmation dialogs
  const [isDeleteRoleDialogOpen, setIsDeleteRoleDialogOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
  const [isDeleteDetailDialogOpen, setIsDeleteDetailDialogOpen] = useState(false)
  const [detailToDelete, setDetailToDelete] = useState<RoleDetail | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { roles, loading, error, createRole, updateRole, deleteRole } = useRoles({ all: true })
  const { roleDetails, loading: detailsLoading, error: detailsError, createRoleDetail, updateRoleDetail, deleteRoleDetail, refetch: refetchDetails } = useRoleDetails({ role_id: selectedRole?.id, all: true })
  const { pages } = usePages({ all: true })

  // Get filtered pages by type (must be defined before gridData)
  const regularPages = useMemo(() => {
    return pages.filter(p => p.is_report !== true && p.is_action !== true)
  }, [pages])

  const reportPages = useMemo(() => {
    return pages.filter(p => p.is_report === true)
  }, [pages])

  const actionPages = useMemo(() => {
    return pages.filter(p => p.is_action === true)
  }, [pages])

  // Get details for selected role
  const selectedRoleDetails = useMemo(() => {
    if (!selectedRole) return []
    return roleDetails.filter(detail => detail.role_id === selectedRole.id)
  }, [roleDetails, selectedRole])

  // Separate regular pages, report pages, and action pages
  const regularPageDetails = useMemo(() => {
    return selectedRoleDetails.filter(detail => {
      const page = pages.find(p => p.page_id === detail.page_id) || detail.page
      return page?.is_report !== true && page?.is_action !== true
    })
  }, [selectedRoleDetails, pages])

  const reportPageDetails = useMemo(() => {
    return selectedRoleDetails.filter(detail => {
      const page = pages.find(p => p.page_id === detail.page_id) || detail.page
      return page?.is_report === true
    })
  }, [selectedRoleDetails, pages])

  const actionPageDetails = useMemo(() => {
    return selectedRoleDetails.filter(detail => {
      const page = pages.find(p => p.page_id === detail.page_id) || detail.page
      return page?.is_action === true
    })
  }, [selectedRoleDetails, pages])

  // Combined grid data: all pages with their current permissions
  const gridData = useMemo(() => {
    if (!selectedRole) return []
    
    // Get all pages and map them with permissions
    return pages.map(page => {
      const existingDetail = selectedRoleDetails.find(d => d.page_id === page.page_id)
      const pendingChange = pendingChanges.get(page.page_id)
      
      // Use pending change if exists, otherwise use existing detail, otherwise default
      const currentPermissions = pendingChange || (existingDetail ? {
        show: existingDetail.show,
        create: existingDetail.create,
        edit: existingDetail.edit,
        delete: existingDetail.delete,
      } : {
        show: false,
        create: false,
        edit: false,
        delete: false,
      })
      
      return {
        page_id: page.page_id,
        page_name: page.page_name,
        description: page.description || null,
        is_report: page.is_report || false,
        is_action: page.is_action || false,
        hasPermission: !!existingDetail,
        detailId: existingDetail?.id,
        ...currentPermissions,
      }
    })
  }, [pages, selectedRoleDetails, selectedRole, pendingChanges])

  // Count rows (pages) that have at least one permission enabled
  const totalAllowedPermissions = useMemo(() => {
    return gridData.filter(item => item.show || item.create || item.edit || item.delete).length
  }, [gridData])

  // Helper function to categorize pages based on their names
  const getPageCategory = useCallback((pageName: string, tab: 'pages' | 'reports' | 'actions'): string => {
    const nameLower = pageName.toLowerCase()
    
    if (tab === 'actions') {
      // Actions tab categories
      if (nameLower.includes('issue')) {
        return 'Issue Resolution'
      } else if (nameLower.includes('material')) {
        return 'Materials'
      } else if (nameLower.includes('project') || nameLower.includes('progress')) {
        return 'Projects'
      }
      return 'Other'
    } else if (tab === 'reports') {
      // Reports tab categories
      // Dashboard reports
      if (nameLower.includes('quarter wise') || 
          nameLower.includes('progress by department') ||
          nameLower.includes('progress by project type') ||
          nameLower.includes('projects status snapshot') ||
          nameLower.includes('funding source mix') ||
          nameLower.includes('kpi') ||
          nameLower.includes('materials summary') ||
          nameLower.includes('dashboard') ||
          nameLower.includes('issues by cause') ||
          nameLower.includes('project status snapshot report')
          ) {
        return 'Dashboard'
      } else if (nameLower.includes('issue')) {
        return 'Issues'
      } else if (nameLower.includes('material')) {
        return 'Other'
      } else if (nameLower.includes('project') || nameLower.includes('progress')) {
        return 'Projects'
      }
      return 'Other'
    } else {
      // Pages tab categories
      // User Management
      if (nameLower.includes('user') || nameLower.includes('role')) {
        return 'User Management'
      }
      // Planning
      if (nameLower.includes('step') || nameLower.includes('project type') || nameLower.includes('business plan')) {
        return 'Planning'
      }
      // Areas
      if (nameLower.includes('circle') || nameLower.includes('division') || nameLower.includes('sub division')) {
        return 'Areas'
      }
      // Profiles
      if (nameLower.includes('department') || nameLower.includes('delay reason') || 
          nameLower.includes('issue') || nameLower.includes('funding source') || 
          nameLower.includes('material')) {
        return 'Profiles'
      }
      return 'Other'
    }
  }, [])

  // Filter grid data by active tab
  const filteredGridData = useMemo(() => {
    if (activeTab === 'pages') {
      return gridData.filter(item => !item.is_report && !item.is_action)
    } else if (activeTab === 'reports') {
      return gridData.filter(item => item.is_report)
    } else if (activeTab === 'actions') {
      return gridData.filter(item => item.is_action)
    }
    return gridData
  }, [gridData, activeTab])

  // Group filtered data by category
  const groupedGridData = useMemo(() => {
    // Group by category for all tabs
    const grouped: Record<string, typeof filteredGridData> = {}
    filteredGridData.forEach(item => {
      const category = getPageCategory(item.page_name, activeTab)
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(item)
    })
    
    // Sort categories in a specific order based on tab
    let categoryOrder: string[] = []
    if (activeTab === 'actions') {
      categoryOrder = ['Projects', 'Materials', 'Issue Resolution', 'Other']
    } else if (activeTab === 'reports') {
      categoryOrder = ['Dashboard', 'Projects', 'Issues', 'Other']
    } else if (activeTab === 'pages') {
      categoryOrder = ['User Management', 'Planning', 'Areas', 'Profiles', 'Other']
    }
    
    const sortedGrouped: Record<string, typeof filteredGridData> = {}
    categoryOrder.forEach(cat => {
      if (grouped[cat]) {
        sortedGrouped[cat] = grouped[cat]
      }
    })
    // Add any remaining categories
    Object.keys(grouped).forEach(cat => {
      if (!sortedGrouped[cat]) {
        sortedGrouped[cat] = grouped[cat]
      }
    })
    
    return sortedGrouped
  }, [filteredGridData, activeTab, getPageCategory])

  // Check if there are any pending changes
  const hasPendingChanges = useMemo(() => {
    return pendingChanges.size > 0
  }, [pendingChanges])

  // Helper function to get page name
  const getPageName = (pageId: number, detail?: RoleDetail) => {
    // First try to use the nested page object from API response
    if (detail?.page?.page_name) {
      return detail.page.page_name
    }
    // Fallback to pages array lookup
    const page = pages.find(p => p.page_id === pageId)
    return page?.page_name || 'N/A'
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortRoles = useCallback((roles: Role[], field: string, direction: 'asc' | 'desc') => {
    return [...roles].sort((a, b) => {
      let aValue: any, bValue: any
      switch (field) {
        case 'name':
          aValue = a.name?.toLowerCase() || ''
          bValue = b.name?.toLowerCase() || ''
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

  const getRoleFieldValue = (role: Role, field: string) => {
    switch (field) {
      case 'name': return role.name || ''
      case 'created_at': return role.created_at
      default: return ''
    }
  }

  const applyRoleFilterCondition = (fieldValue: any, operator: string, filterValue: any) => {
    if ((!filterValue || filterValue.toString().trim() === '') && operator !== 'isEmpty' && operator !== 'isNotEmpty') {
      return false
    }
    switch (operator) {
      case 'contains': return fieldValue.toString().toLowerCase().includes(filterValue.toString().toLowerCase())
      case 'doesNotContain': return !fieldValue.toString().toLowerCase().includes(filterValue.toString().toLowerCase())
      case 'equals': return fieldValue.toString().toLowerCase() === filterValue.toString().toLowerCase()
      case 'doesNotEqual': return fieldValue.toString().toLowerCase() !== filterValue.toString().toLowerCase()
      case 'startsWith': return fieldValue.toString().toLowerCase().startsWith(filterValue.toString().toLowerCase())
      case 'endsWith': return fieldValue.toString().toLowerCase().endsWith(filterValue.toString().toLowerCase())
      case 'isAnyOf':
        const values = filterValue.toString().split(',').map((v: string) => v.trim().toLowerCase())
        return values.includes(fieldValue.toString().toLowerCase())
      case 'isEmpty': return !fieldValue || fieldValue.toString().trim() === ''
      case 'isNotEmpty': return fieldValue && fieldValue.toString().trim() !== ''
      case 'is': return fieldValue === filterValue
      case 'isNot': return fieldValue !== filterValue
      case 'after': return new Date(fieldValue) > new Date(filterValue)
      case 'onOrAfter': return new Date(fieldValue) >= new Date(filterValue)
      case 'before': return new Date(fieldValue) < new Date(filterValue)
      case 'onOrBefore': return new Date(fieldValue) <= new Date(filterValue)
      default: return true
    }
  }

  const filteredRoles = useMemo(() => {
    let filtered = roles
    if (searchTerm) {
      filtered = filtered.filter(role =>
        role.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (filterModel.items.length > 0) {
      filtered = filtered.filter(role => {
        const results = filterModel.items.map(item => {
          const fieldValue = getRoleFieldValue(role, item.field)
          return applyRoleFilterCondition(fieldValue, item.operator, item.value)
        })
        return filterModel.logicOperator === 'and' ? results.every(r => r) : results.some(r => r)
      })
    }
    if (sortField) {
      filtered = sortRoles(filtered, sortField, sortDirection)
    }
    return filtered
  }, [roles, searchTerm, filterModel, sortField, sortDirection, sortRoles])

  const hasActiveFilters = filterModel.items.length > 0 || searchTerm

  const getRoleValueInput = (field: FilterField, operator: string, value: any, onChange: (value: any) => void) => {
    if (operator === 'isEmpty' || operator === 'isNotEmpty') {
      return <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-700 h-9 flex items-center">No value needed</div>
    }
    if (field.type === 'date') {
      return <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="h-9" />
    }
    if (operator === 'isAnyOf') {
      return <Input placeholder="Enter values separated by commas" value={value} onChange={(e) => onChange(e.target.value)} className="h-9" />
    }
    return <Input placeholder="Enter value" value={value} onChange={(e) => onChange(e.target.value)} className="h-9" />
  }

  const getOperatorDisplay = (operator: string) => {
    const map: { [key: string]: string } = {
      'contains': 'contains', 'doesNotContain': 'does not contain', 'equals': 'equals',
      'doesNotEqual': 'does not equal', 'startsWith': 'starts with', 'endsWith': 'ends with',
      'isAnyOf': 'is any of', 'isEmpty': 'is empty', 'isNotEmpty': 'is not empty',
      'is': 'is', 'isNot': 'is not', 'after': 'after', 'onOrAfter': 'on or after',
      'before': 'before', 'onOrBefore': 'on or before'
    }
    return map[operator] || operator
  }

  const handleClearFilters = () => {
    setFilterModel({ items: [], logicOperator: 'and' })
    setSearchTerm('')
  }

  const validateForm = () => {
    const newErrors: { role_name?: string } = {}
    
    if (!formData.role_name.trim()) {
      newErrors.role_name = 'Role name is required'
    } else if (formData.role_name.trim().length > 100) {
      newErrors.role_name = 'Role name must be less than 100 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleOpenDialog = (role?: Role) => {
    if (role) {
      // Prevent editing role with ID 1
      if (role.id === 1) {
        return
      }
      setEditingRole(role)
      setRoleToDuplicate(null) // Clear duplication state
      setFormData({ role_name: role.name || role.role_name || '' })
    } else {
      setEditingRole(null)
      setRoleToDuplicate(null) // Clear duplication state
      setFormData({ role_name: '' })
    }
    setErrors({})
    setIsDialogOpen(true)
  }

  const handleDuplicateRole = async (role: Role) => {
    // Prevent duplicating role with ID 1
    if (role.id === 1) {
      return
    }
    // Set editingRole to null to open in create mode
    setEditingRole(null)
    // Store the role to duplicate permissions from
    setRoleToDuplicate(role)
    // Pre-fill form data with "copy of {role_name}"
    setFormData({ role_name: `copy of ${role.name || role.role_name || ''}` })
    setErrors({})
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    if (isCreating || isUpdating) return
    setIsDialogOpen(false)
    setEditingRole(null)
    setRoleToDuplicate(null) // Clear duplication state
    setFormData({ role_name: '' })
    setErrors({})
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }
    
    // Prevent updating role with ID 1
    if (editingRole && editingRole.id === 1) {
      return
    }
    
    try {
      if (editingRole) {
        setIsUpdating(true)
        await updateRole(editingRole.id, { role_name: formData.role_name })
      } else {
        setIsCreating(true)
        const newRole = await createRole({ role_name: formData.role_name })
        
        // If we're duplicating a role, copy all permissions from the original role
        if (roleToDuplicate && newRole) {
          const newRoleId = newRole.id || newRole.role_id
          if (!newRoleId) {
            console.error('New role does not have an ID')
            return
          }
          
          try {
            // Fetch all role details from the original role
            const originalRoleDetailsResponse = await apiClient.getRoleDetails({ role_id: roleToDuplicate.id, all: true })
            if (originalRoleDetailsResponse.success && originalRoleDetailsResponse.data) {
              const originalDetails = Array.isArray(originalRoleDetailsResponse.data) 
                ? originalRoleDetailsResponse.data 
                : (originalRoleDetailsResponse.data as any).details || []
              
              // Copy each permission to the new role
              for (const detail of originalDetails) {
                await createRoleDetail({
                  role_id: newRoleId,
                  page_id: detail.page_id,
                  show: detail.show,
                  create: detail.create,
                  edit: detail.edit,
                  delete: detail.delete,
                })
              }
            }
          } catch (error) {
            console.error('Failed to copy role permissions:', error)
            // Don't fail the whole operation, just log the error
          }
        }
      }
      handleCloseDialog()
    } catch (error) {
      console.error('Failed to save role:', error)
    } finally {
      setIsCreating(false)
      setIsUpdating(false)
    }
  }

  const handleDelete = (role: Role) => {
    // Prevent deleting role with ID 1
    if (role.id === 1) {
      return
    }
    setRoleToDelete(role)
    setIsDeleteRoleDialogOpen(true)
  }

  const handleConfirmDeleteRole = async () => {
    if (!roleToDelete) return
    // Prevent deleting role with ID 1
    if (roleToDelete.id === 1) {
      setIsDeleteRoleDialogOpen(false)
      setRoleToDelete(null)
      return
    }
    try {
      setIsDeleting(true)
      
      // First, delete all child records (role details/permissions)
      try {
        const roleDetailsResponse = await apiClient.getRoleDetails({ role_id: roleToDelete.id, all: true })
        if (roleDetailsResponse.success && roleDetailsResponse.data) {
          const details = Array.isArray(roleDetailsResponse.data) 
            ? roleDetailsResponse.data 
            : (roleDetailsResponse.data as any).details || []
          
          // Delete each role detail
          for (const detail of details) {
            try {
              await deleteRoleDetail(detail.id)
            } catch (error) {
              console.error(`Failed to delete role detail ${detail.id}:`, error)
              // Continue with other deletions even if one fails
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch or delete role details:', error)
        // Continue with role deletion even if child deletion fails
      }
      
      // Then delete the main role record
      await deleteRole(roleToDelete.id)
      
      // Clear selected role if the deleted role was selected
      if (selectedRole?.id === roleToDelete.id) {
        setSelectedRole(null)
        setPendingChanges(new Map())
      }
      
      setIsDeleteRoleDialogOpen(false)
      setRoleToDelete(null)
    } catch (error) {
      console.error('Failed to delete role:', error)
    } finally {
      setIsDeleting(false)
    }
  }


  // Get the selected page to check if it's a report or action page
  const selectedPage = useMemo(() => {
    const pageId = detailFormData.page_id || detailFormData.report_id || detailFormData.action_id
    if (pageId === 0) return null
    return pages.find(p => p.page_id === pageId) || null
  }, [detailFormData.page_id, detailFormData.report_id, detailFormData.action_id, pages])

  const isReportPage = selectedPage?.is_report === true
  const isActionPage = selectedPage?.is_action === true

  // Detail management functions
  const handleOpenDetailDialog = (detail?: RoleDetail) => {
    if (detail) {
      setEditingDetail(detail)
      // If show is false, force create/edit/delete to false
      const show = detail.show
      // Check if the page is a report or action page
      const page = pages.find(p => p.page_id === detail.page_id) || detail.page
      const isReport = page?.is_report === true
      const isAction = page?.is_action === true
      setDetailFormData({ 
        page_id: isReport || isAction ? 0 : detail.page_id,
        report_id: isReport ? detail.page_id : 0,
        action_id: isAction ? detail.page_id : 0,
        show: show, 
        create: (show && !isReport && !isAction) ? detail.create : false, 
        edit: (show && !isReport) ? detail.edit : false, 
        delete: (show && !isReport && !isAction) ? detail.delete : false 
      })
    } else {
      setEditingDetail(null)
      setDetailFormData({ page_id: 0, report_id: 0, action_id: 0, show: false, create: false, edit: false, delete: false })
    }
    setDetailErrors({})
    setIsDetailDialogOpen(true)
  }

  const handleCloseDetailDialog = () => {
    if (isCreatingDetail || isUpdatingDetail) return
    setIsDetailDialogOpen(false)
    setEditingDetail(null)
    setDetailFormData({ page_id: 0, report_id: 0, action_id: 0, show: false, create: false, edit: false, delete: false })
    setDetailErrors({})
  }

  const validateDetailForm = () => {
    const newErrors: { page_id?: string; report_id?: string; action_id?: string } = {}
    
    const selectedPageId = detailFormData.page_id || detailFormData.report_id || detailFormData.action_id
    if (!selectedPageId || selectedPageId === 0) {
      if (detailFormData.page_id === 0 && detailFormData.report_id === 0 && detailFormData.action_id === 0) {
        newErrors.page_id = 'Please select a page, report, or action'
      }
    }
    
    setDetailErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmitDetail = async () => {
    if (!validateDetailForm() || !selectedRole) {
      return
    }
    
    try {
      if (editingDetail) {
        setIsUpdatingDetail(true)
      } else {
        setIsCreatingDetail(true)
      }
      
      // Get the selected page ID from whichever dropdown was used
      const selectedPageId = detailFormData.page_id || detailFormData.report_id || detailFormData.action_id
      
      // For report pages, ensure create/edit/delete are always false
      // For action pages, ensure create/delete are always false (only show/edit allowed)
      const isReport = selectedPage?.is_report === true
      const isAction = selectedPage?.is_action === true
      
      const submitData = {
        role_id: selectedRole.id,
        page_id: selectedPageId,
        show: detailFormData.show,
        create: (isReport || isAction) ? false : detailFormData.create,
        edit: isReport ? false : detailFormData.edit,
        delete: (isReport || isAction) ? false : detailFormData.delete,
      }
      
      if (editingDetail) {
        await updateRoleDetail(editingDetail.id, {
          show: detailFormData.show,
          create: (isReport || isAction) ? false : detailFormData.create,
          edit: isReport ? false : detailFormData.edit,
          delete: (isReport || isAction) ? false : detailFormData.delete,
        })
      } else {
        await createRoleDetail(submitData)
      }
      await refetchDetails()
      handleCloseDetailDialog()
    } catch (error) {
      console.error('Failed to save role detail:', error)
    } finally {
      setIsCreatingDetail(false)
      setIsUpdatingDetail(false)
    }
  }

  const handleDeleteDetail = (detail: RoleDetail) => {
    setDetailToDelete(detail)
    setIsDeleteDetailDialogOpen(true)
  }

  const handleConfirmDeleteDetail = async () => {
    if (!detailToDelete) return
    try {
      setIsDeleting(true)
      await deleteRoleDetail(detailToDelete.id)
      // Remove from pending changes if exists
      setPendingChanges(prev => {
        const newMap = new Map(prev)
        newMap.delete(detailToDelete.page_id)
        return newMap
      })
      await refetchDetails()
      setIsDeleteDetailDialogOpen(false)
      setDetailToDelete(null)
    } catch (error) {
      console.error('Failed to delete role detail:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Grid UI handlers
  const handlePermissionChange = (pageId: number, permission: 'show' | 'create' | 'edit' | 'delete', value: boolean) => {
    if (!selectedRole) return
    // Prevent changing permissions for role ID 1
    if (selectedRole.id === 1) return
    
    const page = pages.find(p => p.page_id === pageId)
    const isReport = page?.is_report === true
    const isAction = page?.is_action === true
    const existingDetail = selectedRoleDetails.find(d => d.page_id === pageId)
    
    setPendingChanges(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(pageId) || (existingDetail ? {
        show: existingDetail.show,
        create: existingDetail.create,
        edit: existingDetail.edit,
        delete: existingDetail.delete,
      } : {
        show: false,
        create: false,
        edit: false,
        delete: false,
      })
      
      const updated = { ...current }
      
      if (permission === 'show') {
        updated.show = value
        // If show is unchecked, uncheck all others
        if (!value) {
          updated.create = false
          updated.edit = false
          updated.delete = false
        }
        // For reports, create/edit/delete are always false
        // For actions, create/delete are always false
        if (isReport || isAction) {
          updated.create = false
        }
        if (isReport) {
          updated.edit = false
        }
        if (isReport || isAction) {
          updated.delete = false
        }
      } else {
        updated[permission] = value
      }
      
      // Check if this matches the original state
      const original = existingDetail ? {
        show: existingDetail.show,
        create: existingDetail.create,
        edit: existingDetail.edit,
        delete: existingDetail.delete,
      } : {
        show: false,
        create: false,
        edit: false,
        delete: false,
      }
      
      const isSame = JSON.stringify(updated) === JSON.stringify(original)
      
      if (isSame) {
        newMap.delete(pageId)
      } else {
        newMap.set(pageId, updated)
      }
      
      return newMap
    })
  }

  const handleSelectAllForRow = (pageId: number, checked: boolean) => {
    if (!selectedRole) return
    // Prevent changing permissions for role ID 1
    if (selectedRole.id === 1) return
    
    const page = pages.find(p => p.page_id === pageId)
    const isReport = page?.is_report === true
    const isAction = page?.is_action === true
    const existingDetail = selectedRoleDetails.find(d => d.page_id === pageId)
    
    setPendingChanges(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(pageId) || (existingDetail ? {
        show: existingDetail.show,
        create: existingDetail.create,
        edit: existingDetail.edit,
        delete: existingDetail.delete,
      } : {
        show: false,
        create: false,
        edit: false,
        delete: false,
      })
      
      let updated
      if (checked) {
        // Select all applicable permissions
        if (isReport) {
          // Reports: only Show
          updated = { show: true, create: false, edit: false, delete: false }
        } else if (isAction) {
          // Actions: Show and Edit
          updated = { show: true, create: false, edit: true, delete: false }
        } else {
          // Regular pages: Show, Create, Edit, Delete
          updated = { show: true, create: true, edit: true, delete: true }
        }
      } else {
        // Unselect all permissions
        updated = { show: false, create: false, edit: false, delete: false }
      }
      
      // Check if this matches the original state
      const original = existingDetail ? {
        show: existingDetail.show,
        create: existingDetail.create,
        edit: existingDetail.edit,
        delete: existingDetail.delete,
      } : {
        show: false,
        create: false,
        edit: false,
        delete: false,
      }
      
      const isSame = JSON.stringify(updated) === JSON.stringify(original)
      
      if (isSame) {
        newMap.delete(pageId)
      } else {
        newMap.set(pageId, updated)
      }
      
      return newMap
    })
  }

  // Check if all applicable permissions are selected for a row
  const isAllSelectedForRow = (item: typeof gridData[0]) => {
    const isReport = item.is_report
    const isAction = item.is_action
    
    if (isReport) {
      // Reports: only Show
      return item.show
    } else if (isAction) {
      // Actions: Show and Edit
      return item.show && item.edit
    } else {
      // Regular pages: Show, Create, Edit, Delete
      return item.show && item.create && item.edit && item.delete
    }
  }

  // Check if all rows are fully selected (all applicable permissions for each row)
  const isAllRowsSelected = () => {
    if (filteredGridData.length === 0) return false
    return filteredGridData.every(item => isAllSelectedForRow(item))
  }

  // Handle select all rows (all permissions for all rows)
  const handleSelectAllRows = (checked: boolean) => {
    if (!selectedRole) return
    // Prevent changing permissions for role ID 1
    if (selectedRole.id === 1) return
    
    setPendingChanges(prev => {
      const newMap = new Map(prev)
      
      filteredGridData.forEach(item => {
        const pageId = item.page_id
        const isReport = item.is_report
        const isAction = item.is_action
        const existingDetail = selectedRoleDetails.find(d => d.page_id === pageId)
        
        let updated
        if (checked) {
          // Select all applicable permissions
          if (isReport) {
            // Reports: only Show
            updated = { show: true, create: false, edit: false, delete: false }
          } else if (isAction) {
            // Actions: Show and Edit
            updated = { show: true, create: false, edit: true, delete: false }
          } else {
            // Regular pages: Show, Create, Edit, Delete
            updated = { show: true, create: true, edit: true, delete: true }
          }
        } else {
          // Unselect all permissions
          updated = { show: false, create: false, edit: false, delete: false }
        }
        
        // Check if this matches the original state
        const original = existingDetail ? {
          show: existingDetail.show,
          create: existingDetail.create,
          edit: existingDetail.edit,
          delete: existingDetail.delete,
        } : {
          show: false,
          create: false,
          edit: false,
          delete: false,
        }
        
        const isSame = JSON.stringify(updated) === JSON.stringify(original)
        
        if (isSame) {
          newMap.delete(pageId)
        } else {
          newMap.set(pageId, updated)
        }
      })
      
      return newMap
    })
  }

  // Check if all applicable rows are selected for a column permission
  const isAllSelectedForColumn = (permission: 'show' | 'create' | 'edit' | 'delete') => {
    if (filteredGridData.length === 0) return false
    
    return filteredGridData.every(item => {
      const isReport = item.is_report
      const isAction = item.is_action
      
      if (permission === 'show') {
        return item.show
      } else if (permission === 'create') {
        // Create is only applicable to regular pages
        if (isReport || isAction) return true // N/A items are considered "selected"
        return item.show && item.create
      } else if (permission === 'edit') {
        // Edit is applicable to regular pages and actions
        if (isReport) return true // N/A items are considered "selected"
        return item.show && item.edit
      } else if (permission === 'delete') {
        // Delete is only applicable to regular pages
        if (isReport || isAction) return true // N/A items are considered "selected"
        return item.show && item.delete
      }
      return false
    })
  }

  // Handle select all for a column
  const handleSelectAllForColumn = (permission: 'show' | 'create' | 'edit' | 'delete', checked: boolean) => {
    if (!selectedRole) return
    // Prevent changing permissions for role ID 1
    if (selectedRole.id === 1) return
    
    setPendingChanges(prev => {
      const newMap = new Map(prev)
      
      filteredGridData.forEach(item => {
        const pageId = item.page_id
        const isReport = item.is_report
        const isAction = item.is_action
        const existingDetail = selectedRoleDetails.find(d => d.page_id === pageId)
        
        const current = newMap.get(pageId) || (existingDetail ? {
          show: existingDetail.show,
          create: existingDetail.create,
          edit: existingDetail.edit,
          delete: existingDetail.delete,
        } : {
          show: false,
          create: false,
          edit: false,
          delete: false,
        })
        
        const updated = { ...current }
        
        if (permission === 'show') {
          updated.show = checked
          if (!checked) {
            // If show is unchecked, uncheck all others
            updated.create = false
            updated.edit = false
            updated.delete = false
          }
        } else if (permission === 'create') {
          // Only applicable to regular pages
          if (!isReport && !isAction) {
            updated.create = checked
            // Create requires show to be true
            if (checked && !updated.show) {
              updated.show = true
            }
          }
        } else if (permission === 'edit') {
          // Applicable to regular pages and actions
          if (!isReport) {
            updated.edit = checked
            // Edit requires show to be true
            if (checked && !updated.show) {
              updated.show = true
            }
          }
        } else if (permission === 'delete') {
          // Only applicable to regular pages
          if (!isReport && !isAction) {
            updated.delete = checked
            // Delete requires show to be true
            if (checked && !updated.show) {
              updated.show = true
            }
          }
        }
        
        // Check if this matches the original state
        const original = existingDetail ? {
          show: existingDetail.show,
          create: existingDetail.create,
          edit: existingDetail.edit,
          delete: existingDetail.delete,
        } : {
          show: false,
          create: false,
          edit: false,
          delete: false,
        }
        
        const isSame = JSON.stringify(updated) === JSON.stringify(original)
        
        if (isSame) {
          newMap.delete(pageId)
        } else {
          newMap.set(pageId, updated)
        }
      })
      
      return newMap
    })
  }

  const handleDiscardChanges = () => {
    setPendingChanges(new Map())
  }

  const handleSaveChanges = async () => {
    if (!selectedRole || pendingChanges.size === 0) return
    // Prevent saving changes for role ID 1
    if (selectedRole.id === 1) return
    
    try {
      setIsSaving(true)
      
      // Prepare all API calls upfront
      const apiCalls: Promise<void>[] = []
      
      for (const [pageId, permissions] of pendingChanges.entries()) {
        const existingDetail = selectedRoleDetails.find(d => d.page_id === pageId)
        const page = pages.find(p => p.page_id === pageId)
        const isReport = page?.is_report === true
        const isAction = page?.is_action === true
        
        const submitData = {
          show: permissions.show,
          create: (isReport || isAction) ? false : permissions.create,
          edit: isReport ? false : permissions.edit,
          delete: (isReport || isAction) ? false : permissions.delete,
        }
        
        // Create promise for this API call
        const apiCall = (async () => {
          try {
            if (existingDetail) {
              // Update existing
              await updateRoleDetail(existingDetail.id, submitData)
            } else {
              // Create new
              await createRoleDetail({
                role_id: selectedRole.id,
                page_id: pageId,
                ...submitData,
              })
            }
          } catch (error) {
            console.error(`Failed to save permission for page ${pageId}:`, error)
            // Continue processing remaining requests even if one fails
          }
        })()
        
        apiCalls.push(apiCall)
      }
      
      // Process all API calls in parallel
      await Promise.allSettled(apiCalls)
      
      // Refetch details after all saves complete
      // Keep pendingChanges until after refetch to prevent grid from updating mid-refetch
      try {
        await refetchDetails()
      } catch (error) {
        console.error('Failed to refetch details:', error)
      }
      
      // Clear pending changes AFTER refetch completes
      // This ensures the grid doesn't update until all data is refreshed
      setPendingChanges(new Map())
    } catch (error) {
      console.error('Failed to save permissions:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Reset pending changes when role changes
  const handleRoleSelect = (role: Role) => {
    setPendingChanges(new Map())
    setSelectedRole(role)
  }

  return (
    <div className="relative -mx-6 px-6" style={{ height: 'calc(100vh - 7rem)' }}>
      <div className="flex h-full gap-6 w-full min-w-[1000px]">
        {/* Left Sidebar - Roles List */}
        <div className="w-70 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-800 h-full">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Roles</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage roles and their permissions</p>
              </div>
              <Button onClick={() => handleOpenDialog()} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
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

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin mb-2 text-gray-400 dark:text-gray-500" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading roles...</p>
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No roles found</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{hasActiveFilters ? 'Try adjusting your filters' : 'Get started by adding your first role'}</p>
              </div>
            ) : (
              <div className="p-2">
                {filteredRoles.map((role) => (
                  <div
                    key={role.id}
                    onClick={() => handleRoleSelect(role)}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-all mb-2 border",
                      selectedRole?.id === role.id
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-sm"
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">{role.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">ID: {role.id}</div>
                      </div>
                      {role.id !== 1 && (
                        <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDuplicateRole(role)} 
                            className="h-6 w-6 p-0"
                            title="Duplicate role"
                          >
                            <Copy className="h-3 w-3 text-blue-600" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleOpenDialog(role)} 
                            className="h-6 w-6 p-0"
                            title="Edit role"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(role)} 
                            className="h-6 w-6 p-0"
                            title="Delete role"
                          >
                            <X className="h-3 w-3 text-red-600" />
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
          {selectedRole ? (
            <div className="space-y-6 w-full">
              {/* Master Info */}
              <div className="rounded-md border border-gray-200 dark:border-gray-800 bg-transparent shadow-none p-4 w-full">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Role</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedRole.name}</p>
                  </div>
                  {selectedRole.id !== 1 && (
                    <Button 
                      onClick={() => handleOpenDialog(selectedRole)} 
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
                    <span className="font-medium text-gray-900 dark:text-white">{selectedRole.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-42">
                      <Calendar className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Created</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{formatDate(selectedRole.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-42">
                      <Shield className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Name</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedRole.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-42">
                      <Shield className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Total Permissions</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{totalAllowedPermissions}</span>
                  </div>
                </div>
              </div>

              {/* Page Permissions - Interactive Grid */}
              <Card className={`w-full ${selectedRole.id === 1 ? 'opacity-75' : ''}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Page Permissions</CardTitle>
                      <CardDescription>Manage permissions for this role on different pages</CardDescription>
                    </div>
                    {hasPendingChanges && selectedRole.id !== 1 && (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleDiscardChanges} disabled={isSaving}>
                          Discard
                        </Button>
                        <Button onClick={handleSaveChanges} disabled={isSaving}>
                          {isSaving ? (
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
                    {selectedRole.id === 1 && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Permissions cannot be modified for this role
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {detailsError && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                      <p className="text-red-600 dark:text-red-400">{detailsError}</p>
                    </div>
                  )}

                  {/* Tabs Navigation */}
                  <div className={`flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900 mb-6 ${selectedRole.id === 1 ? 'opacity-50 pointer-events-none' : ''}`}>
                    <button
                      onClick={() => setActiveTab('pages')}
                      disabled={selectedRole.id === 1}
                      className={`px-4 py-2 font-medium w-full rounded-md text-sm transition-colors ${
                        activeTab === 'pages'
                          ? 'shadow-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      Pages ({gridData.filter(item => !item.is_report && !item.is_action).length})
                    </button>
                    <button
                      onClick={() => setActiveTab('reports')}
                      disabled={selectedRole.id === 1}
                      className={`px-4 py-2 font-medium w-full rounded-md text-sm transition-colors ${
                        activeTab === 'reports'
                          ? 'shadow-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      Reports ({gridData.filter(item => item.is_report).length})
                    </button>
                    <button
                      onClick={() => setActiveTab('actions')}
                      disabled={selectedRole.id === 1}
                      className={`px-4 py-2 font-medium w-full rounded-md text-sm transition-colors ${
                        activeTab === 'actions'
                          ? 'shadow-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      Actions ({gridData.filter(item => item.is_action).length})
                    </button>
                  </div>

                  {detailsLoading && !isSaving ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading permissions...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-center min-w-[100px]"></TableHead>
                            <TableHead className="min-w-[200px]">Page Name</TableHead>
                            <TableHead className="text-center min-w-[80px]">Type</TableHead>
                            <TableHead className="text-center min-w-[100px]">Show</TableHead>
                            {activeTab === 'pages' && (
                              <>
                                <TableHead className="text-center min-w-[100px]">Create</TableHead>
                                <TableHead className="text-center min-w-[100px]">Edit</TableHead>
                                <TableHead className="text-center min-w-[100px]">Delete</TableHead>
                              </>
                            )}
                            {activeTab === 'actions' && (
                              <TableHead className="text-center min-w-[100px]">Action</TableHead>
                            )}
                            <TableHead className="text-right min-w-[100px]"></TableHead>
                          </TableRow>
                          <TableRow>
                            <TableHead className="text-center min-w-[100px]">
                              <div className="flex justify-center items-center">
                                <Checkbox
                                  checked={isAllRowsSelected()}
                                  onChange={(checked) => handleSelectAllRows(checked)}
                                  disabled={selectedRole.id === 1}
                                />
                              </div>
                            </TableHead>
                            <TableHead className="min-w-[200px]"></TableHead>
                            <TableHead className="text-center min-w-[80px]"></TableHead>
                            <TableHead className="text-center min-w-[100px]">
                              <div className="flex justify-center items-center">
                                <Checkbox
                                  checked={isAllSelectedForColumn('show')}
                                  onChange={(checked) => handleSelectAllForColumn('show', checked)}
                                  disabled={selectedRole.id === 1}
                                />
                              </div>
                            </TableHead>
                            {activeTab === 'pages' && (
                              <>
                                <TableHead className="text-center min-w-[100px]">
                                  <div className="flex justify-center items-center">
                                    {filteredGridData.some(item => !item.is_report && !item.is_action) && (
                                      <Checkbox
                                        checked={isAllSelectedForColumn('create')}
                                        onChange={(checked) => handleSelectAllForColumn('create', checked)}
                                        disabled={selectedRole.id === 1}
                                      />
                                    )}
                                  </div>
                                </TableHead>
                                <TableHead className="text-center min-w-[100px]">
                                  <div className="flex justify-center items-center">
                                    {filteredGridData.some(item => !item.is_report) && (
                                      <Checkbox
                                        checked={isAllSelectedForColumn('edit')}
                                        onChange={(checked) => handleSelectAllForColumn('edit', checked)}
                                        disabled={selectedRole.id === 1}
                                      />
                                    )}
                                  </div>
                                </TableHead>
                                <TableHead className="text-center min-w-[100px]">
                                  <div className="flex justify-center items-center">
                                    {filteredGridData.some(item => !item.is_report && !item.is_action) && (
                                      <Checkbox
                                        checked={isAllSelectedForColumn('delete')}
                                        onChange={(checked) => handleSelectAllForColumn('delete', checked)}
                                        disabled={selectedRole.id === 1}
                                      />
                                    )}
                                  </div>
                                </TableHead>
                              </>
                            )}
                            {activeTab === 'actions' && (
                              <TableHead className="text-center min-w-[100px]">
                                <div className="flex justify-center items-center">
                                  {filteredGridData.some(item => !item.is_report) && (
                                    <Checkbox
                                      checked={isAllSelectedForColumn('edit')}
                                      onChange={(checked) => handleSelectAllForColumn('edit', checked)}
                                    />
                                  )}
                                </div>
                              </TableHead>
                            )}
                            <TableHead className="text-right min-w-[100px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredGridData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={activeTab === 'actions' || activeTab === 'reports' ? 6 : 8} className="text-center py-12">
                                <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                  {activeTab === 'pages' && 'No regular pages available'}
                                  {activeTab === 'reports' && 'No report pages available'}
                                  {activeTab === 'actions' && 'No action pages available'}
                                </p>
                                <p className="text-gray-500 dark:text-gray-400">Pages will appear here once they are added to the system</p>
                              </TableCell>
                            </TableRow>
                          ) : (
                            Object.entries(groupedGridData).map(([category, items]) => {
                              // Don't render empty categories
                              if (items.length === 0) return null
                              
                              return (
                                <React.Fragment key={category}>
                                  {/* Category Header Row - only show if not "All" and has multiple categories */}
                                  {category !== 'All' && Object.keys(groupedGridData).length > 1 && (
                                    <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                                      <TableCell 
                                        colSpan={activeTab === 'actions' || activeTab === 'reports' ? 6 : 8}
                                        className="font-semibold text-gray-900 dark:text-white py-3"
                                      >
                                        {category}
                                      </TableCell>
                                    </TableRow>
                                  )}
                                  {/* Items in this category */}
                                  {items.map((item) => {
                                    const hasChange = pendingChanges.has(item.page_id)
                                    const isReport = item.is_report
                                    const isAction = item.is_action
                                    
                                    return (
                                      <TableRow 
                                        key={item.page_id}
                                        className={hasChange ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}
                                      >
                                        <TableCell className="text-center">
                                          <div className="flex justify-center items-center">
                                            <Checkbox
                                              checked={isAllSelectedForRow(item)}
                                              onChange={(checked) => handleSelectAllForRow(item.page_id, checked)}
                                              disabled={selectedRole.id === 1}
                                            />
                                          </div>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                          <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                              {item.page_name}
                                              {hasChange && (
                                                <span className="text-xs text-blue-600 dark:text-blue-400">(modified)</span>
                                              )}
                                            </div>
                                            {item.description && (
                                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                                ({item.description})
                                              </div>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            isReport 
                                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                              : isAction
                                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                          }`}>
                                            {isReport ? 'Report' : isAction ? 'Action' : 'Page'}
                                          </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <div className="flex justify-center items-center">
                                            <Checkbox
                                              checked={item.show}
                                              onChange={(checked) => handlePermissionChange(item.page_id, 'show', checked)}
                                              disabled={selectedRole.id === 1}
                                            />
                                          </div>
                                        </TableCell>
                                        {activeTab === 'pages' && (
                                          <>
                                            <TableCell className="text-center">
                                              <div className="flex justify-center items-center">
                                                <Checkbox
                                                  checked={item.show ? item.create : false}
                                                  onChange={(checked) => handlePermissionChange(item.page_id, 'create', checked)}
                                                  disabled={!item.show || selectedRole.id === 1}
                                                />
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                              <div className="flex justify-center items-center">
                                                <Checkbox
                                                  checked={item.show ? item.edit : false}
                                                  onChange={(checked) => handlePermissionChange(item.page_id, 'edit', checked)}
                                                  disabled={!item.show || selectedRole.id === 1}
                                                />
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                              <div className="flex justify-center items-center">
                                                <Checkbox
                                                  checked={item.show ? item.delete : false}
                                                  onChange={(checked) => handlePermissionChange(item.page_id, 'delete', checked)}
                                                  disabled={!item.show || selectedRole.id === 1}
                                                />
                                              </div>
                                            </TableCell>
                                          </>
                                        )}
                                        {activeTab === 'actions' && (
                                          <TableCell className="text-center">
                                            <div className="flex justify-center items-center">
                                              <Checkbox
                                                checked={item.show ? item.edit : false}
                                                onChange={(checked) => handlePermissionChange(item.page_id, 'edit', checked)}
                                                disabled={!item.show || selectedRole.id === 1}
                                              />
                                            </div>
                                          </TableCell>
                                        )}
                                        <TableCell className="text-right">
                                          {item.hasPermission && item.detailId && selectedRole.id !== 1 && (
                                            <Button 
                                              variant="ghost" 
                                              size="sm" 
                                              onClick={() => {
                                                const detail = selectedRoleDetails.find(d => d.id === item.detailId)
                                                if (detail) handleDeleteDetail(detail)
                                              }}
                                            >
                                              <X className="h-4 w-4 text-red-600" />
                                            </Button>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    )
                                  })}
                                </React.Fragment>
                              )
                            })
                          )}
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
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Role Selected</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Select a role from the list to view its permissions</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Role
              </Button>
            </div>
          )}
        </div>

        {/* Detail Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={(open) => {
          if (!open && (isCreating || isUpdating)) return
          setIsDetailDialogOpen(open)
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingDetail ? 'Edit Role Permission' : 'Add Role Permission'}</DialogTitle>
              <DialogDescription>
                {editingDetail 
                  ? 'Update permission settings for this role on the selected page' 
                  : 'Assign permissions to this role for a specific page'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Three separate dropdowns for Pages, Reports, and Actions */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="page_id">Page <span className="text-red-500">*</span></Label>
                  <Select
                    value={detailFormData.page_id.toString()}
                    onValueChange={(value) => {
                      const newPageId = Number(value)
                      setDetailFormData({ 
                        ...detailFormData, 
                        page_id: newPageId,
                        report_id: 0, // Clear other selections
                        action_id: 0, // Clear other selections
                      })
                      if (detailErrors.page_id || detailErrors.report_id || detailErrors.action_id) {
                        setDetailErrors({})
                      }
                    }}
                    disabled={!!editingDetail}
                  >
                    <SelectTrigger className={detailErrors.page_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select a page" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">None</SelectItem>
                      {regularPages.map((page) => {
                        // Check if this page is already used for this role (only in create mode)
                        const isAlreadyUsed = !editingDetail && selectedRoleDetails.some(d => d.page_id === page.page_id)
                        return (
                          <SelectItem 
                            key={page.page_id} 
                            value={page.page_id.toString()}
                            disabled={isAlreadyUsed}
                          >
                            <div className="flex flex-col">
                              <span>{page.page_name}</span>
                              {page.description && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">{page.description}</span>
                              )}
                              {isAlreadyUsed && <span className="text-gray-400 dark:text-gray-500 text-xs">(already added)</span>}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="report_id">Report <span className="text-red-500">*</span></Label>
                  <Select
                    value={detailFormData.report_id.toString()}
                    onValueChange={(value) => {
                      const newPageId = Number(value)
                      setDetailFormData({ 
                        ...detailFormData, 
                        report_id: newPageId,
                        page_id: 0, // Clear other selections
                        action_id: 0, // Clear other selections
                      })
                      if (detailErrors.page_id || detailErrors.report_id || detailErrors.action_id) {
                        setDetailErrors({})
                      }
                    }}
                    disabled={!!editingDetail}
                  >
                    <SelectTrigger className={detailErrors.report_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select a report" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">None</SelectItem>
                      {reportPages.map((page) => {
                        // Check if this page is already used for this role (only in create mode)
                        const isAlreadyUsed = !editingDetail && selectedRoleDetails.some(d => d.page_id === page.page_id)
                        return (
                          <SelectItem 
                            key={page.page_id} 
                            value={page.page_id.toString()}
                            disabled={isAlreadyUsed}
                          >
                            <div className="flex flex-col">
                              <span>{page.page_name}</span>
                              {page.description && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">{page.description}</span>
                              )}
                              {isAlreadyUsed && <span className="text-gray-400 dark:text-gray-500 text-xs">(already added)</span>}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="action_id">Action <span className="text-red-500">*</span></Label>
                  <Select
                    value={detailFormData.action_id.toString()}
                    onValueChange={(value) => {
                      const newPageId = Number(value)
                      setDetailFormData({ 
                        ...detailFormData, 
                        action_id: newPageId,
                        page_id: 0, // Clear other selections
                        report_id: 0, // Clear other selections
                      })
                      if (detailErrors.page_id || detailErrors.report_id || detailErrors.action_id) {
                        setDetailErrors({})
                      }
                    }}
                    disabled={!!editingDetail}
                  >
                    <SelectTrigger className={detailErrors.action_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select an action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">None</SelectItem>
                      {actionPages.map((page) => {
                        // Check if this page is already used for this role (only in create mode)
                        const isAlreadyUsed = !editingDetail && selectedRoleDetails.some(d => d.page_id === page.page_id)
                        return (
                          <SelectItem 
                            key={page.page_id} 
                            value={page.page_id.toString()}
                            disabled={isAlreadyUsed}
                          >
                            <div className="flex flex-col">
                              <span>{page.page_name}</span>
                              {page.description && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">{page.description}</span>
                              )}
                              {isAlreadyUsed && <span className="text-gray-400 dark:text-gray-500 text-xs">(already added)</span>}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {(detailErrors.page_id || detailErrors.report_id || detailErrors.action_id) && (
                  <p className="text-sm text-red-500">
                    {detailErrors.page_id || detailErrors.report_id || detailErrors.action_id}
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="space-y-2">
                  {!isReportPage && !isActionPage && (
                    <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
                      <Checkbox
                        id="select-all"
                        checked={detailFormData.show && detailFormData.create && detailFormData.edit && detailFormData.delete}
                        onChange={(checked) => {
                          setDetailFormData(prev => ({
                            ...prev,
                            show: checked,
                            create: checked,
                            edit: checked,
                            delete: checked
                          }))
                        }}
                        label="Select All"
                      />
                    </div>
                  )}
                  <Checkbox
                    id="show"
                    checked={detailFormData.show}
                    onChange={(checked) => {
                      setDetailFormData(prev => ({ 
                        ...prev, 
                        show: checked,
                        // Uncheck create, edit, delete if show is unchecked or if it's a report/action page
                        create: (checked && !isReportPage && !isActionPage) ? prev.create : false,
                        edit: (checked && !isReportPage) ? prev.edit : false,
                        delete: (checked && !isReportPage && !isActionPage) ? prev.delete : false
                      }))
                    }}
                    label="Show"
                  />
                  {isReportPage ? (
                    <>
                      <div className="flex items-center space-x-3 py-1">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Create</span>
                        <span className="text-sm text-gray-400 dark:text-gray-500">N/A</span>
                      </div>
                      <div className="flex items-center space-x-3 py-1">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Edit</span>
                        <span className="text-sm text-gray-400 dark:text-gray-500">N/A</span>
                      </div>
                      <div className="flex items-center space-x-3 py-1">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Delete</span>
                        <span className="text-sm text-gray-400 dark:text-gray-500">N/A</span>
                      </div>
                    </>
                  ) : isActionPage ? (
                    <>
                      <div className="flex items-center space-x-3 py-1">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Create</span>
                        <span className="text-sm text-gray-400 dark:text-gray-500">N/A</span>
                      </div>
                      <Checkbox
                        id="edit"
                        checked={detailFormData.show ? detailFormData.edit : false}
                        onChange={(checked) => {
                          setDetailFormData(prev => ({ ...prev, edit: checked }))
                        }}
                        label="Edit"
                        disabled={!detailFormData.show}
                      />
                      <div className="flex items-center space-x-3 py-1">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Delete</span>
                        <span className="text-sm text-gray-400 dark:text-gray-500">N/A</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Checkbox
                        id="create"
                        checked={detailFormData.show ? detailFormData.create : false}
                        onChange={(checked) => {
                          setDetailFormData(prev => ({ ...prev, create: checked }))
                        }}
                        label="Create"
                        disabled={!detailFormData.show}
                      />
                      <Checkbox
                        id="edit"
                        checked={detailFormData.show ? detailFormData.edit : false}
                        onChange={(checked) => {
                          setDetailFormData(prev => ({ ...prev, edit: checked }))
                        }}
                        label="Edit"
                        disabled={!detailFormData.show}
                      />
                      <Checkbox
                        id="delete"
                        checked={detailFormData.show ? detailFormData.delete : false}
                        onChange={(checked) => {
                          setDetailFormData(prev => ({ ...prev, delete: checked }))
                        }}
                        label="Delete"
                        disabled={!detailFormData.show}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDetailDialog} disabled={isCreatingDetail || isUpdatingDetail}>Cancel</Button>
              <Button onClick={handleSubmitDetail} disabled={isCreatingDetail || isUpdatingDetail}>
                {isCreatingDetail || isUpdatingDetail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingDetail ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingDetail ? 'Update' : 'Create'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AdvancedFilterDialog
          isOpen={isFilterDialogOpen}
          onClose={() => setIsFilterDialogOpen(false)}
          onApplyFilters={() => {}}
          filterModel={filterModel}
          onFilterModelChange={setFilterModel}
          fields={roleFilterFields}
          getOperatorsForField={getRoleOperatorsForField}
          getValueInput={getRoleValueInput}
        />

        {/* Delete Role Confirmation Dialog */}
        <Dialog open={isDeleteRoleDialogOpen} onOpenChange={(open) => {
          if (!open && isDeleting) return
          setIsDeleteRoleDialogOpen(open)
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Role</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{roleToDelete?.name || roleToDelete?.role_name}</strong>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsDeleteRoleDialogOpen(false)
                setRoleToDelete(null)
              }} disabled={isDeleting}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleConfirmDeleteRole}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Role'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Role Detail Confirmation Dialog */}
        <Dialog open={isDeleteDetailDialogOpen} onOpenChange={(open) => {
          if (!open && isDeleting) return
          setIsDeleteDetailDialogOpen(open)
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Permission</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the permission for <strong>{detailToDelete ? getPageName(detailToDelete.page_id, detailToDelete) : 'this page'}</strong>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsDeleteDetailDialogOpen(false)
                setDetailToDelete(null)
              }} disabled={isDeleting}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleConfirmDeleteDetail}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Permission'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open && (isCreating || isUpdating)) return
          setIsDialogOpen(open)
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRole ? 'Edit Role' : 'Add New Role'}</DialogTitle>
              <DialogDescription>
                {editingRole ? 'Update role information' : 'Create a new role'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="role_name">Role Name <span className="text-red-500">*</span></Label>
                <Input 
                  id="role_name" 
                  value={formData.role_name} 
                  onChange={(e) => {
                    setFormData({ ...formData, role_name: e.target.value })
                    if (errors.role_name) {
                      setErrors({ ...errors, role_name: undefined })
                    }
                  }}
                  className={errors.role_name ? 'border-red-500' : ''}
                  required 
                />
                {errors.role_name && (
                  <p className="text-sm text-red-500">{errors.role_name}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog} disabled={isCreating || isUpdating}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isCreating || isUpdating}>
                {isCreating || isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingRole ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingRole ? 'Update' : 'Create'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
