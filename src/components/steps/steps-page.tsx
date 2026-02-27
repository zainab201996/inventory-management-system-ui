'use client'

import Link from 'next/link'
import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useSteps } from '@/hooks/use-steps'
import { useUserAccess } from '@/hooks/use-user-access'
import { useUsersDepartments } from '@/hooks/use-users-departments'
import { apiClient } from '@/lib/api-client'
import { formatDate } from '@/lib/utils'
import { Step } from '@/types'
import { Search, Plus, Edit, Trash2, Loader2, Filter, X, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { AdvancedFilterDialog, FilterField, FilterOperator } from '@/components/ui/advanced-filter-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const stepFilterFields: FilterField[] = [
  { value: 'name', label: 'Name', type: 'text' },
  { value: 'department', label: 'Department', type: 'text' },
  { value: 'created_at', label: 'Created Date', type: 'date' }
]

const getStepOperatorsForField = (field: string): FilterOperator[] => {
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
    if (!isActive) return <ArrowUpDown className="h-4 w-4 text-gray-400" />
    return sortDirection === 'asc'
      ? <ArrowUp className="h-4 w-4 text-gray-500" />
      : <ArrowDown className="h-4 w-4 text-gray-500" />
  }
  return (
    <TableHead
      className="cursor-pointer select-none hover:bg-gray-50 normal-case tracking-normal text-theme-xs font-medium text-gray-500 dark:text-gray-400"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-2">
        <span>{children}</span>
        {getSortIcon()}
      </div>
    </TableHead>
  )
}

export function StepsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterModel, setFilterModel] = useState({
    items: [] as Array<{ id: number; field: string; operator: string; value: any }>,
    logicOperator: 'and' as 'and' | 'or'
  })
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingStep, setEditingStep] = useState<Step | null>(null)
  const [formData, setFormData] = useState({ name: '', department_id: 0 })
  const [errors, setErrors] = useState<{ name?: string; department_id?: string }>({})
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Delete confirmation dialog
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [stepToDelete, setStepToDelete] = useState<Step | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { steps, loading, error, createStep, updateStep, deleteStep } = useSteps({ all: true })
  const { access } = useUserAccess()
  const currentUserId = apiClient.getUserId()
  const { userDepartments, loading: departmentsLoading, error: departmentsError } = useUsersDepartments({ 
    user_id: currentUserId || undefined 
  })

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortSteps = useCallback((steps: Step[], field: string, direction: 'asc' | 'desc') => {
    return [...steps].sort((a, b) => {
      let aValue: any, bValue: any
      switch (field) {
        case 'name':
          aValue = a.name?.toLowerCase() || ''
          bValue = b.name?.toLowerCase() || ''
          break
        case 'department':
          aValue = (a.department_name || '').toLowerCase()
          bValue = (b.department_name || '').toLowerCase()
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

  const getStepFieldValue = (step: Step, field: string) => {
    switch (field) {
      case 'name': return step.name || ''
      case 'department': return step.department_name || ''
      case 'created_at': return step.created_at
      default: return ''
    }
  }

  const applyStepFilterCondition = (fieldValue: any, operator: string, filterValue: any) => {
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

  const filteredSteps = useMemo(() => {
    let filtered = steps
    if (searchTerm) {
      filtered = filtered.filter(step =>
        step.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (filterModel.items.length > 0) {
      filtered = filtered.filter(step => {
        const results = filterModel.items.map(item => {
          const fieldValue = getStepFieldValue(step, item.field)
          return applyStepFilterCondition(fieldValue, item.operator, item.value)
        })
        return filterModel.logicOperator === 'and' ? results.every(r => r) : results.some(r => r)
      })
    }
    if (sortField) {
      filtered = sortSteps(filtered, sortField, sortDirection)
    }
    return filtered
  }, [steps, searchTerm, filterModel, sortField, sortDirection, sortSteps])

  const hasActiveFilters = filterModel.items.length > 0 || searchTerm

  const getStepValueInput = (field: FilterField, operator: string, value: any, onChange: (value: any) => void) => {
    if (operator === 'isEmpty' || operator === 'isNotEmpty') {
      return <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-md border h-9 flex items-center">No value needed</div>
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
    const newErrors: { name?: string; department_id?: string } = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Name must be less than 100 characters'
    }
    
    // Only validate department_id when creating (not editing)
    if (!editingStep && (!formData.department_id || formData.department_id <= 0)) {
      newErrors.department_id = 'Department is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleOpenDialog = (step?: Step) => {
    if (step) {
      setEditingStep(step)
      setFormData({ name: step.name, department_id: 0 })
    } else {
      setEditingStep(null)
      setFormData({ name: '', department_id: 0 })
    }
    setErrors({})
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    if (isCreating || isUpdating) return
    setIsDialogOpen(false)
    setEditingStep(null)
    setFormData({ name: '', department_id: 0 })
    setErrors({})
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }
    
    try {
      if (editingStep) {
        setIsUpdating(true)
        await updateStep(editingStep.id, { s_name: formData.name })
      } else {
        setIsCreating(true)
        await createStep({ s_name: formData.name, department_id: formData.department_id })
      }
      handleCloseDialog()
    } catch (error) {
      console.error('Failed to save step:', error)
    } finally {
      setIsCreating(false)
      setIsUpdating(false)
    }
  }

  const handleDelete = (step: Step) => {
    setStepToDelete(step)
    setIsDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!stepToDelete) return
    try {
      setIsDeleting(true)
      await deleteStep(stepToDelete.id)
      setIsDeleteConfirmOpen(false)
      setStepToDelete(null)
    } catch (error) {
      console.error('Failed to delete step:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Steps
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage reusable project execution steps for building project templates/workflows
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
                Steps
              </li>
            </ol>
          </nav>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Step
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium text-gray-800 dark:text-white/90">
            Step Management
          </CardTitle>
          <CardDescription className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Search and filter your steps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search steps..."
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

          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead field="name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                  Name
                </SortableTableHead>
                <SortableTableHead field="department" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                  Department
                </SortableTableHead>
                <SortableTableHead field="created" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                  Created
                </SortableTableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">Loading steps...</p>
                  </TableCell>
                </TableRow>
              ) : filteredSteps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">No steps found</p>
                    <p className="text-gray-500 dark:text-gray-400">{hasActiveFilters ? 'Try adjusting your filters' : 'Get started by adding your first step'}</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSteps.map((step) => (
                  <TableRow key={step.id}>
                    <TableCell className="font-medium">{step.name}</TableCell>
                    <TableCell>{step.department_name || 'N/A'}</TableCell>
                    <TableCell>{formatDate(step.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(step)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(step)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AdvancedFilterDialog
        isOpen={isFilterDialogOpen}
        onClose={() => setIsFilterDialogOpen(false)}
        onApplyFilters={() => {}}
        filterModel={filterModel}
        onFilterModelChange={setFilterModel}
        fields={stepFilterFields}
        getOperatorsForField={getStepOperatorsForField}
        getValueInput={getStepValueInput}
      />

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open && (isCreating || isUpdating)) return
        setIsDialogOpen(open)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStep ? 'Edit Step' : 'Add New Step'}</DialogTitle>
            <DialogDescription>
              {editingStep ? 'Update step information' : 'Create a new step'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!editingStep && (
              <div className="space-y-2">
                <Label htmlFor="department_id">Department <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.department_id > 0 ? formData.department_id.toString() : undefined}
                  onValueChange={(value) => {
                    setFormData({ ...formData, department_id: Number(value) })
                    if (errors.department_id) {
                      setErrors({ ...errors, department_id: undefined })
                    }
                  }}
                  disabled={departmentsLoading}
                >
                  <SelectTrigger className={errors.department_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder={departmentsLoading ? "Loading..." : "Select department"} />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentsLoading ? (
                      <div className="p-2 text-sm text-gray-500">Loading departments...</div>
                    ) : departmentsError ? (
                      <div className="p-2 text-sm text-red-500">Error: {departmentsError}</div>
                    ) : userDepartments.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">No departments available</div>
                    ) : (
                      userDepartments.filter(ud => ud.department?.dept_id).map((ud) => (
                        <SelectItem key={ud.department!.dept_id} value={ud.department!.dept_id.toString()}>
                          {ud.department!.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.department_id && (
                  <p className="text-sm text-red-500">{errors.department_id}</p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
              <Input 
                id="name" 
                value={formData.name} 
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  if (errors.name) {
                    setErrors({ ...errors, name: undefined })
                  }
                }}
                className={errors.name ? 'border-red-500' : ''}
                required 
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isCreating || isUpdating}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingStep ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingStep ? 'Update' : 'Create'
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
            <DialogTitle>Delete Step</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{stepToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDeleteConfirmOpen(false)
              setStepToDelete(null)
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
                'Delete Step'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

