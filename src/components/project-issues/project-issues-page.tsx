'use client'

import Link from 'next/link'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProjectIssues } from '@/hooks/use-project-issues'
import { useBusinessPlans } from '@/hooks/use-business-plans'
import { useIssues } from '@/hooks/use-issues'
import { useIssueCategories } from '@/hooks/use-issues-categories'
import { useUserAccess, getSlugForName } from '@/hooks/use-user-access'
import { formatDate } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import { ProjectIssue, Issue } from '@/types'
import { Search, Plus, Edit, Trash2, Loader2, Filter, X, AlertCircle, CheckCircle } from 'lucide-react'
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
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'

const projectIssueFilterFields: FilterField[] = [
  { value: 'issue_name', label: 'Issue Name', type: 'text' },
  { value: 'project_name', label: 'Project Name', type: 'text' },
  { value: 'status', label: 'Status', type: 'text' },
  { value: 'created_at', label: 'Created Date', type: 'date' },
  { value: 'updated_at', label: 'Updated Date', type: 'date' }
]

const getProjectIssueOperatorsForField = (field: string): FilterOperator[] => {
  switch (field) {
    case 'created_at':
    case 'updated_at':
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


const getStatusDisplay = (status: number) => {
  switch (status) {
    case 0: return 'Open'
    case 2: return 'Resolved'
    default: return 'Unknown'
  }
}

const getStatusBadgeColor = (status: number) => {
  switch (status) {
    case 0: return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    case 2: return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
  }
}

const getStatusTopIndicatorColor = (status: number) => {
  switch (status) {
    case 0: return 'bg-red-300 dark:bg-red-400'
    case 2: return 'bg-green-300 dark:bg-green-400'
    default: return 'bg-gray-300 dark:bg-gray-400'
  }
}

export function ProjectIssuesPage() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterModel, setFilterModel] = useState({
    items: [] as Array<{ id: number; field: string; operator: string; value: any }>,
    logicOperator: 'and' as 'and' | 'or'
  })
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProjectIssue, setEditingProjectIssue] = useState<ProjectIssue | null>(null)
  const [formData, setFormData] = useState({ 
    issue_id: 0, 
    proj_id: 0,
    s_id: 0,
    remarks_1: '', // Opening remarks - editable when status is 0 (open)
    remarks_3: '' // Resolved remarks - editable when status is 2 (resolved)
  })
  const [errors, setErrors] = useState<{ issue_id?: string; proj_id?: string; s_id?: string }>({})
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Status change dialogs
  const [isMarkResolvedDialogOpen, setIsMarkResolvedDialogOpen] = useState(false)
  const [selectedProjectIssueForStatusChange, setSelectedProjectIssueForStatusChange] = useState<ProjectIssue | null>(null)
  const [statusChangeRemarks, setStatusChangeRemarks] = useState('')
  const [isResolving, setIsResolving] = useState(false)

  // Delete confirmation dialog
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [projectIssueToDelete, setProjectIssueToDelete] = useState<ProjectIssue | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { projectIssues, loading, error, createProjectIssueAction, updateProjectIssue, openProjectIssue, completeProjectIssue, deleteProjectIssue } = useProjectIssues({ all: true })
  const { businessPlans, loading: businessPlansLoading } = useBusinessPlans({ all: true })
  const { issues, loading: issuesLoading } = useIssues({ all: true })
  const { issueCategories } = useIssueCategories({ all: true })

  const { access } = useUserAccess()

  // Steps for selected business plan
  const [stepOptions, setStepOptions] = useState<Array<{ s_id: number; name: string }>>([])
  const [stepsLoading, setStepsLoading] = useState(false)
  const [stepsError, setStepsError] = useState<string | null>(null)

  // Load steps for selected business plan when proj_id changes
  useEffect(() => {
    let isCancelled = false

    const loadSteps = async () => {
      if (!formData.proj_id) {
        setStepOptions([])
        setStepsError(null)
        return
      }
      try {
        setStepsLoading(true)
        setStepsError(null)
        const response = await apiClient.getBusinessPlanDetails({ proj_id: formData.proj_id, all: true })
        if (!response.success || !response.data) {
          if (!isCancelled) {
            setStepOptions([])
            setStepsError(response.message || 'Failed to load steps for selected business plan')
          }
          return
        }
        const rawDetails = Array.isArray(response.data)
          ? response.data
          : (response.data as any).details || []

        const stepMap = new Map<number, string>()
        for (const d of rawDetails as any[]) {
          const sid = d.s_id
          if (!sid || stepMap.has(sid)) continue
          const stepObj = d.step
          const name =
            (stepObj && (stepObj.s_name || stepObj.name)) ||
            d.step_name ||
            `Step ${sid}`
          stepMap.set(sid, name)
        }

        if (!isCancelled) {
          setStepOptions(Array.from(stepMap.entries()).map(([s_id, name]) => ({ s_id, name })))
        }
      } catch (e) {
        if (!isCancelled) {
          setStepOptions([])
          setStepsError('Failed to load steps for selected business plan')
        }
      } finally {
        if (!isCancelled) {
          setStepsLoading(false)
        }
      }
    }

    loadSteps()

    return () => {
      isCancelled = true
    }
  }, [formData.proj_id])

  // Group issues by category
  const issuesByCategory = useMemo(() => {
    const grouped: { [key: string]: Issue[] } = {}
    const uncategorized: Issue[] = []
    
    issues.forEach(issue => {
      if (issue.issue_category_id && issue.issue_category) {
        const categoryName = issue.issue_category.name
        if (!grouped[categoryName]) {
          grouped[categoryName] = []
        }
        grouped[categoryName].push(issue)
      } else {
        uncategorized.push(issue)
      }
    })
    
    return { grouped, uncategorized }
  }, [issues])
  const hasShowPermission = access?.aggregatedPermissions?.[getSlugForName('Project Issues')]?.show === true
  const hasEditPermission = access?.aggregatedPermissions?.[getSlugForName('Project Issues')]?.edit === true
  // Check permissions for action endpoints (separate from project-issues page)
  const hasOpenIssuePermission = access?.aggregatedPermissions?.[getSlugForName('Project Issue Open')]?.edit === true
  const hasResolveIssuePermission = access?.aggregatedPermissions?.[getSlugForName('Project Issue Complete')]?.edit === true

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortProjectIssues = useCallback((projectIssues: ProjectIssue[], field: string, direction: 'asc' | 'desc') => {
    return [...projectIssues].sort((a, b) => {
      let aValue: any, bValue: any
      switch (field) {
        case 'issue_name':
          aValue = (a.issue?.name || '').toLowerCase()
          bValue = (b.issue?.name || '').toLowerCase()
          break
        case 'project_name':
          aValue = (a.business_plan?.name || '').toLowerCase()
          bValue = (b.business_plan?.name || '').toLowerCase()
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'created':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        case 'updated':
          aValue = a.updated_at ? new Date(a.updated_at).getTime() : 0
          bValue = b.updated_at ? new Date(b.updated_at).getTime() : 0
          break
        default:
          return 0
      }
      if (aValue < bValue) return direction === 'asc' ? -1 : 1
      if (aValue > bValue) return direction === 'asc' ? 1 : -1
      return 0
    })
  }, [])

  const getProjectIssueFieldValue = (projectIssue: ProjectIssue, field: string) => {
    switch (field) {
      case 'issue_name': return projectIssue.issue?.name || ''
      case 'project_name': return projectIssue.business_plan?.name || ''
      case 'status': return getStatusDisplay(projectIssue.status)
      case 'created_at': return projectIssue.created_at
      case 'updated_at': return projectIssue.updated_at || ''
      default: return ''
    }
  }

  const applyProjectIssueFilterCondition = (fieldValue: any, operator: string, filterValue: any) => {
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

  const filteredProjectIssues = useMemo(() => {
    let filtered = projectIssues
    if (searchTerm) {
      filtered = filtered.filter(projectIssue =>
        projectIssue.issue?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        projectIssue.business_plan?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (filterModel.items.length > 0) {
      filtered = filtered.filter(projectIssue => {
        const results = filterModel.items.map(item => {
          const fieldValue = getProjectIssueFieldValue(projectIssue, item.field)
          return applyProjectIssueFilterCondition(fieldValue, item.operator, item.value)
        })
        return filterModel.logicOperator === 'and' ? results.every(r => r) : results.some(r => r)
      })
    }
    if (sortField) {
      filtered = sortProjectIssues(filtered, sortField, sortDirection)
    }
    return filtered
  }, [projectIssues, searchTerm, filterModel, sortField, sortDirection, sortProjectIssues])

  const hasActiveFilters = filterModel.items.length > 0 || searchTerm

  const getProjectIssueValueInput = (field: FilterField, operator: string, value: any, onChange: (value: any) => void) => {
    if (operator === 'isEmpty' || operator === 'isNotEmpty') {
      return <div className="px-3 py-2 text-sm text-gray-500 bg-gray-100 rounded-md border h-9 flex items-center">No value needed</div>
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
    const newErrors: { issue_id?: string; proj_id?: string; s_id?: string } = {}
    
    if (!formData.issue_id || formData.issue_id === 0) {
      newErrors.issue_id = 'Issue is required'
    }
    
    if (!formData.proj_id || formData.proj_id === 0) {
      newErrors.proj_id = 'Business plan is required'
    }

    // Step selection is required when opening a new project issue (create mode)
    if (!editingProjectIssue) {
      if (!formData.s_id || formData.s_id === 0) {
        newErrors.s_id = 'Step is required'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleOpenDialog = (projectIssue?: ProjectIssue) => {
    if (projectIssue) {
      setEditingProjectIssue(projectIssue)
      setFormData({ 
        issue_id: projectIssue.issue_id, 
        proj_id: projectIssue.proj_id,
        s_id: projectIssue.s_id || 0,
        remarks_1: projectIssue.remarks_1 || '',
        remarks_3: projectIssue.remarks_3 || ''
      })
    } else {
      setEditingProjectIssue(null)
      setFormData({ 
        issue_id: 0, 
        proj_id: 0,
        s_id: 0,
        remarks_1: '', // For creation only
        remarks_3: ''
      })
    }
    setErrors({})
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    if (isCreating || isUpdating) return
    setIsDialogOpen(false)
    setEditingProjectIssue(null)
    setFormData({ 
      issue_id: 0, 
      proj_id: 0,
      s_id: 0,
      remarks_1: '',
      remarks_3: ''
    })
    setErrors({})
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }
    
    try {
      if (editingProjectIssue) {
        setIsUpdating(true)
        // Update issue_id, proj_id, and remarks based on status
        const updatePayload: any = {
          issue_id: formData.issue_id,
          proj_id: formData.proj_id
        }
        // remarks_1 (Opening remarks) can be updated when status is 0 (open)
        if (editingProjectIssue.status === 0) {
          updatePayload.remarks_1 = formData.remarks_1.trim() || null
        }
        // remarks_3 (Resolved remarks) can be updated when status is 2 (resolved)
        if (editingProjectIssue.status === 2) {
          updatePayload.remarks_3 = formData.remarks_3.trim() || null
        }
        await updateProjectIssue(editingProjectIssue.pi_id, updatePayload)
      } else {
        setIsCreating(true)
        // Use action endpoint to open project issue (requires s_id)
        await createProjectIssueAction({
          issue_id: formData.issue_id,
          proj_id: formData.proj_id,
          s_id: formData.s_id,
          remarks_1: formData.remarks_1.trim() || null // Initial opening remarks
        })
      }
      handleCloseDialog()
    } catch (error) {
      console.error('Failed to save project issue:', error)
    } finally {
      setIsCreating(false)
      setIsUpdating(false)
    }
  }

  const handleDelete = (projectIssue: ProjectIssue) => {
    setProjectIssueToDelete(projectIssue)
    setIsDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!projectIssueToDelete) return
    try {
      setIsDeleting(true)
      await deleteProjectIssue(projectIssueToDelete.pi_id)
      setIsDeleteConfirmOpen(false)
      setProjectIssueToDelete(null)
    } catch (error) {
      console.error('Failed to delete project issue:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleMarkResolved = (projectIssue: ProjectIssue) => {
    if (!hasResolveIssuePermission) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'You do not have permission to resolve issues',
      })
      return
    }
    setSelectedProjectIssueForStatusChange(projectIssue)
    setStatusChangeRemarks(projectIssue.remarks_3 || '')
    setIsMarkResolvedDialogOpen(true)
  }

  const handleMarkResolvedSubmit = async () => {
    if (!selectedProjectIssueForStatusChange) return
    
    try {
      setIsResolving(true)
      // Use complete action endpoint which sets status to 2 and allows remarks_3
      const result = await completeProjectIssue(
        selectedProjectIssueForStatusChange.pi_id,
        statusChangeRemarks.trim() || null
      )
      
      // Close dialog regardless of result (error will be shown via error state)
      setIsMarkResolvedDialogOpen(false)
      setSelectedProjectIssueForStatusChange(null)
      setStatusChangeRemarks('')
    } catch (error) {
      console.error('Failed to mark as resolved:', error)
    } finally {
      setIsResolving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Project Issues
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            View and manage issues for all projects
          </p>
          <nav>
            <ol className="mt-1 flex items-center gap-1.5">
              <li>
                <Link
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"
                  href="/"
                >
                  Home
                  <svg
                    className="stroke-current"
                    width="17"
                    height="16"
                    viewBox="0 0 17 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </li>
              <li className="text-sm text-gray-800 dark:text-white/90">
                Project Issues
              </li>
            </ol>
          </nav>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Open New Issue
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium text-gray-800 dark:text-white/90">
            Project Issue Management
          </CardTitle>
          <CardDescription className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Search and filter your project issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search project issues..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            {/* <Button variant="outline" onClick={() => setIsFilterDialogOpen(true)}>
              <Filter className="mr-2 h-4 w-4" />
              Advanced Filters
            </Button> */}
          </div>

          {hasActiveFilters && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Applied Filters</h3>
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                  Clear All
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {searchTerm && (
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    <Search className="h-3 w-3" />
                    <span>Search: "{searchTerm}"</span>
                    <button onClick={() => setSearchTerm('')} className="ml-1 hover:bg-blue-200 rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {filterModel.items.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2">
                    {index > 0 && (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        filterModel.logicOperator === 'and' ? 'bg-orange-200 text-orange-800' : 'bg-pink-200 text-pink-800'
                      }`}>
                        {filterModel.logicOperator.toUpperCase()}
                      </span>
                    )}
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                      <Filter className="h-3 w-3" />
                      <span>{item.field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} {getOperatorDisplay(item.operator)} {item.value || 'empty'}</span>
                      <button
                        onClick={() => setFilterModel(prev => ({ ...prev, items: prev.items.filter(f => f.id !== item.id) }))}
                        className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Loading project issues...</p>
            </div>
          ) : filteredProjectIssues.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">No project issues found</p>
              <p className="text-gray-500 dark:text-gray-400">{hasActiveFilters ? 'Try adjusting your filters' : 'Get started by adding your first project issue'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjectIssues.map((projectIssue) => (
                <Card 
                  key={projectIssue.pi_id}
                  className="overflow-hidden border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 bg-white dark:bg-gray-900/50 relative"
                >
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${getStatusTopIndicatorColor(projectIssue.status)} shadow-sm`} />
                  <CardHeader className="pb-3 pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/10 to-red-600/10 dark:from-red-600/20 dark:to-red-700/20 border border-red-200 dark:border-red-800/50 flex-shrink-0">
                            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </div>
                          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {projectIssue.issue?.name || 'N/A'}
                          </CardTitle>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          {projectIssue.business_plan?.name || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          Step:{' '}
                          {projectIssue.step_name
                            || (projectIssue.s_id != null ? `Step ${projectIssue.s_id}` : 'N/A')}
                        </p>
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(projectIssue.status)}`}>
                            {getStatusDisplay(projectIssue.status)}
                          </span>
                        </div>
                        {projectIssue.status === 0 && hasResolveIssuePermission && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkResolved(projectIssue)}
                            className="mt-2 bg-green-500 hover:bg-green-600 text-white"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Mark as Resolved
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleOpenDialog(projectIssue)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(projectIssue)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Remarks for Issue Opening</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 rounded-md p-3 border border-gray-200 dark:border-gray-700 min-h-[60px]">
                        {projectIssue.remarks_1 || <span className="text-gray-400 dark:text-gray-500 italic">No remarks added</span>}
                      </p>
                    </div>
                    {projectIssue.status === 2 && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Remarks for Issue Resolved</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 rounded-md p-3 border border-green-200 dark:border-green-800/50 min-h-[60px]">
                          {projectIssue.remarks_3 || <span className="text-gray-400 dark:text-gray-500 italic">No remarks added</span>}
                        </p>
                      </div>
                    )}
                    <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3">
                      {projectIssue.opened_at && (
                        <div className="flex justify-between">
                          <span>Opened at:</span>
                          <span className="text-gray-700 dark:text-gray-300">{formatDate(projectIssue.opened_at)}</span>
                        </div>
                      )}
                      {projectIssue.completed_at && (
                        <div className="flex justify-between">
                          <span>Resolved at:</span>
                          <span className="text-gray-700 dark:text-gray-300">{formatDate(projectIssue.completed_at)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Created:</span>
                        <span className="text-gray-700 dark:text-gray-300">{formatDate(projectIssue.created_at)}</span>
                      </div>
                      {projectIssue.updated_at && (
                        <div className="flex justify-between">
                          <span>Updated:</span>
                          <span className="text-gray-700 dark:text-gray-300">{formatDate(projectIssue.updated_at)}</span>
                        </div>
                      )}
                      {projectIssue.updated_by_username && (
                        <div className="flex justify-between">
                          <span>Updated by:</span>
                          <span className="text-gray-700 dark:text-gray-300">{projectIssue.updated_by_username}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AdvancedFilterDialog
        isOpen={isFilterDialogOpen}
        onClose={() => setIsFilterDialogOpen(false)}
        onApplyFilters={() => {}}
        filterModel={filterModel}
        onFilterModelChange={setFilterModel}
        fields={projectIssueFilterFields}
        getOperatorsForField={getProjectIssueOperatorsForField}
        getValueInput={getProjectIssueValueInput}
      />

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open && (isCreating || isUpdating)) return
        setIsDialogOpen(open)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProjectIssue ? 'Edit Project Issue' : 'Add New Project Issue'}</DialogTitle>
            <DialogDescription>
              {editingProjectIssue 
                ? 'Update project issue information. Note: Status cannot be edited here. remarks_1 (Opening remarks) can be edited when issue status is "Open" (status 0). remarks_3 (Resolved remarks) can be edited when issue status is "Resolved" (status 2).'
                : 'Create a new project issue'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="issue_id">Issue <span className="text-red-500">*</span></Label>
              <Select
                value={formData.issue_id > 0 ? formData.issue_id.toString() : undefined}
                onValueChange={(value) => {
                  setFormData({ ...formData, issue_id: Number(value) })
                  if (errors.issue_id) {
                    setErrors({ ...errors, issue_id: undefined })
                  }
                }}
              >
                <SelectTrigger className={errors.issue_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder={issuesLoading ? "Loading..." : "Select issue"} />
                </SelectTrigger>
                <SelectContent>
                  {issuesLoading ? (
                    <div className="p-2 text-sm text-gray-500">Loading issues...</div>
                  ) : issues.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No issues available</div>
                  ) : (
                    <>
                      {Object.entries(issuesByCategory.grouped).map(([categoryName, categoryIssues]) => (
                        <SelectGroup key={categoryName}>
                          <SelectLabel className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold uppercase text-xs tracking-wide border-b border-gray-200 dark:border-gray-700">
                            {categoryName}
                          </SelectLabel>
                          {categoryIssues.map((issue) => (
                            <SelectItem key={issue.id} value={issue.id.toString()} className="pl-12">
                              {issue.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                      {issuesByCategory.uncategorized.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold uppercase text-xs tracking-wide border-b border-gray-200 dark:border-gray-700">
                            Uncategorized
                          </SelectLabel>
                          {issuesByCategory.uncategorized.map((issue) => (
                            <SelectItem key={issue.id} value={issue.id.toString()} className="pl-12">
                              {issue.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
              {errors.issue_id && (
                <p className="text-sm text-red-500">{errors.issue_id}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="proj_id">Business Plan <span className="text-red-500">*</span></Label>
              <Select
                value={formData.proj_id > 0 ? formData.proj_id.toString() : undefined}
                onValueChange={(value) => {
                  setFormData({ ...formData, proj_id: Number(value), s_id: 0 })
                  if (errors.proj_id) {
                    setErrors({ ...errors, proj_id: undefined })
                  }
                  if (errors.s_id) {
                    setErrors(prev => ({ ...prev, s_id: undefined }))
                  }
                }}
              >
                <SelectTrigger className={errors.proj_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder={businessPlansLoading ? "Loading..." : "Select business plan"} />
                </SelectTrigger>
                <SelectContent>
                  {businessPlansLoading ? (
                    <div className="p-2 text-sm text-gray-500">Loading business plans...</div>
                  ) : businessPlans.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No business plans available</div>
                  ) : (
                    businessPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id.toString()}>
                        {plan.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.proj_id && (
                <p className="text-sm text-red-500">{errors.proj_id}</p>
              )}
            </div>
            {!editingProjectIssue && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="s_id">Step <span className="text-red-500">*</span></Label>
                  <Select
                    disabled={formData.proj_id === 0 || stepsLoading || stepOptions.length === 0}
                    value={formData.s_id > 0 ? formData.s_id.toString() : undefined}
                    onValueChange={(value) => {
                      setFormData({ ...formData, s_id: Number(value) })
                      if (errors.s_id) {
                        setErrors({ ...errors, s_id: undefined })
                      }
                    }}
                  >
                    <SelectTrigger className={errors.s_id ? 'border-red-500' : ''}>
                      <SelectValue
                        placeholder={
                          formData.proj_id === 0
                            ? 'Select a business plan first'
                        : stepsLoading
                        ? 'Loading steps...'
                        : stepOptions.length === 0
                        ? 'No started steps available for this business plan'
                        : 'Select step'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.proj_id === 0 ? (
                        <div className="p-2 text-sm text-gray-500">
                          Select a business plan first
                        </div>
                      ) : stepsLoading ? (
                        <div className="p-2 text-sm text-gray-500">Loading steps...</div>
                      ) : stepOptions.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">No started steps available</div>
                      ) : (
                        stepOptions.map((opt) => (
                          <SelectItem key={opt.s_id} value={opt.s_id.toString()}>
                            {opt.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.s_id && (
                    <p className="text-sm text-red-500">{errors.s_id}</p>
                  )}
                  {stepsError && (
                    <p className="text-xs text-red-500">{stepsError}</p>
                  )}
                </div>
              <div className="space-y-2">
                <Label htmlFor="remarks_1">Remarks for Issue Opening</Label>
                <Textarea
                  id="remarks_1"
                  value={formData.remarks_1}
                  onChange={(e) => setFormData({ ...formData, remarks_1: e.target.value })}
                  placeholder="Enter remarks for issue opening..."
                  rows={3}
                />
              </div>
              </>
            )}
            {editingProjectIssue && (
              <>
                {/* Remarks for Issue Opening (remarks_1) - Editable when status is 0 (open) */}
                <div className="space-y-2">
                  <Label htmlFor="remarks_1">
                    Opening Remarks
                    {editingProjectIssue.status === 0 && <span className="text-gray-500 dark:text-gray-400 text-xs ml-2">(Editable when open)</span>}
                  </Label>
                  {editingProjectIssue.status === 0 ? (
                    <>
                      <Textarea
                        id="remarks_1"
                        value={formData.remarks_1}
                        onChange={(e) => setFormData({ ...formData, remarks_1: e.target.value })}
                        placeholder="Enter opening remarks..."
                        rows={3}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        This field can be edited when the issue status is "Open" (status 0).
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 rounded-md p-3 border border-gray-200 dark:border-gray-700 min-h-[60px]">
                        {editingProjectIssue.remarks_1 || <span className="text-gray-400 dark:text-gray-500 italic">No remarks added</span>}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        This field can only be edited when the issue status is "Open" (status 0).
                      </p>
                    </>
                  )}
                </div>
                
                {/* Remarks for Issue Resolved (remarks_3) - Editable when status is 2 (resolved) */}
                {editingProjectIssue.status === 2 && (
                  <div className="space-y-2">
                    <Label htmlFor="remarks_3">
                      Resolved Remarks
                      <span className="text-gray-500 dark:text-gray-400 text-xs ml-2">(Editable when resolved)</span>
                    </Label>
                    <Textarea
                      id="remarks_3"
                      value={formData.remarks_3}
                      onChange={(e) => setFormData({ ...formData, remarks_3: e.target.value })}
                      placeholder="Enter resolved remarks..."
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      This field can be edited when the issue status is "Resolved" (status 2).
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isCreating || isUpdating}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingProjectIssue ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingProjectIssue ? 'Update' : 'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Resolved Dialog */}
      <Dialog open={isMarkResolvedDialogOpen} onOpenChange={(open) => {
        if (!open && isResolving) return
        setIsMarkResolvedDialogOpen(open)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Resolved</DialogTitle>
            <DialogDescription>
              Add remarks for resolving this issue
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="remarks_3">Resolved Remarks</Label>
              <Textarea
                id="remarks_3"
                value={statusChangeRemarks}
                onChange={(e) => setStatusChangeRemarks(e.target.value)}
                placeholder="Enter resolved remarks..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              if (isResolving) return
              setIsMarkResolvedDialogOpen(false)
              setSelectedProjectIssueForStatusChange(null)
              setStatusChangeRemarks('')
            }} disabled={isResolving}>
              Cancel
            </Button>
            <Button onClick={handleMarkResolvedSubmit} disabled={isResolving} className="bg-green-500 hover:bg-green-600 text-white">
              {isResolving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resolving...
                </>
              ) : (
                'Mark as Resolved'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={(open) => {
        if (!open && isDeleting) return
        setIsDeleteConfirmOpen(open)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project Issue</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the issue <strong>{projectIssueToDelete?.issue?.name}</strong> for project <strong>{projectIssueToDelete?.business_plan?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDeleteConfirmOpen(false)
              setProjectIssueToDelete(null)
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
                'Delete Issue'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
