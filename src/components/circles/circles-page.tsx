'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import ComponentCard from '@/components/common/component-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCircles } from '@/hooks/use-circles'
import { formatDate } from '@/lib/utils'
import { Circle } from '@/types'
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

const circleFilterFields: FilterField[] = [
  { value: 'name', label: 'Name', type: 'text' },
  { value: 'description', label: 'Description', type: 'text' },
  { value: 'created_at', label: 'Created Date', type: 'date' },
  { value: 'updated_at', label: 'Updated Date', type: 'date' }
]

const getCircleOperatorsForField = (field: string): FilterOperator[] => {
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

export function CirclesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterModel, setFilterModel] = useState({
    items: [] as Array<{ id: number; field: string; operator: string; value: any }>,
    logicOperator: 'and' as 'and' | 'or'
  })
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCircle, setEditingCircle] = useState<Circle | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({})
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Delete confirmation dialog
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [circleToDelete, setCircleToDelete] = useState<Circle | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { circles, loading, error, createCircle, updateCircle, deleteCircle } = useCircles({ all: true })

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortCircles = useCallback((circles: Circle[], field: string, direction: 'asc' | 'desc') => {
    return [...circles].sort((a, b) => {
      let aValue: any, bValue: any
      switch (field) {
        case 'name':
          aValue = a.name?.toLowerCase() || ''
          bValue = b.name?.toLowerCase() || ''
          break
        case 'description':
          aValue = a.description?.toLowerCase() || ''
          bValue = b.description?.toLowerCase() || ''
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

  const getCircleFieldValue = (circle: Circle, field: string) => {
    switch (field) {
      case 'name': return circle.name || ''
      case 'description': return circle.description || ''
      case 'created_at': return circle.created_at
      case 'updated_at': return circle.updated_at || ''
      default: return ''
    }
  }

  const applyCircleFilterCondition = (fieldValue: any, operator: string, filterValue: any) => {
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

  const filteredCircles = useMemo(() => {
    let filtered = circles
    if (searchTerm) {
      filtered = filtered.filter(circle =>
        circle.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        circle.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (filterModel.items.length > 0) {
      filtered = filtered.filter(circle => {
        const results = filterModel.items.map(item => {
          const fieldValue = getCircleFieldValue(circle, item.field)
          return applyCircleFilterCondition(fieldValue, item.operator, item.value)
        })
        return filterModel.logicOperator === 'and' ? results.every(r => r) : results.some(r => r)
      })
    }
    if (sortField) {
      filtered = sortCircles(filtered, sortField, sortDirection)
    }
    return filtered
  }, [circles, searchTerm, filterModel, sortField, sortDirection, sortCircles])

  const hasActiveFilters = filterModel.items.length > 0 || searchTerm

  const getCircleValueInput = (field: FilterField, operator: string, value: any, onChange: (value: any) => void) => {
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
    const newErrors: { name?: string; description?: string } = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Name must be less than 100 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleOpenDialog = (circle?: Circle) => {
    if (circle) {
      setEditingCircle(circle)
      setFormData({ name: circle.name, description: circle.description || '' })
    } else {
      setEditingCircle(null)
      setFormData({ name: '', description: '' })
    }
    setErrors({})
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    if (isCreating || isUpdating) return
    setIsDialogOpen(false)
    setEditingCircle(null)
    setFormData({ name: '', description: '' })
    setErrors({})
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }
    
    try {
      if (editingCircle) {
        setIsUpdating(true)
        await updateCircle(editingCircle.id, formData)
      } else {
        setIsCreating(true)
        await createCircle(formData)
      }
      handleCloseDialog()
    } catch (error) {
      console.error('Failed to save circle:', error)
    } finally {
      setIsCreating(false)
      setIsUpdating(false)
    }
  }

  const handleDelete = (circle: Circle) => {
    setCircleToDelete(circle)
    setIsDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!circleToDelete) return
    try {
      setIsDeleting(true)
      await deleteCircle(circleToDelete.id)
      setIsDeleteConfirmOpen(false)
      setCircleToDelete(null)
    } catch (error) {
      console.error('Failed to delete circle:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Circles
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage organizational circles
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
                Circles
              </li>
            </ol>
          </nav>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Circle
        </Button>
      </div>

      <ComponentCard
        title="Circle Management"
        desc="Search and filter your circles"
      >
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                placeholder="Search circles..."
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
          <div className="mb-4 mt-4 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Applied Filters
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Clear All
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {searchTerm && (
                <div className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
                  <Search className="h-3 w-3" />
                  <span>Search: "{searchTerm}"</span>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="ml-1 rounded-full p-0.5 hover:bg-blue-200"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {filterModel.items.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2">
                  {index > 0 && (
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        filterModel.logicOperator === 'and'
                          ? 'bg-orange-200 text-orange-800'
                          : 'bg-pink-200 text-pink-800'
                      }`}
                    >
                      {filterModel.logicOperator.toUpperCase()}
                    </span>
                  )}
                  <div className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-800">
                    <Filter className="h-3 w-3" />
                    <span>
                      {item.field
                        .replace('_', ' ')
                        .replace(/\b\w/g, (l) => l.toUpperCase())}{' '}
                      {getOperatorDisplay(item.operator)} {item.value || 'empty'}
                    </span>
                    <button
                      onClick={() =>
                        setFilterModel((prev) => ({
                          ...prev,
                          items: prev.items.filter((f) => f.id !== item.id),
                        }))
                      }
                      className="ml-1 rounded-full p-0.5 hover:bg-purple-200"
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
          <div className="mb-4 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead
                field="name"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Name
              </SortableTableHead>
              <SortableTableHead
                field="description"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Description
              </SortableTableHead>
              <SortableTableHead
                field="created"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Created
              </SortableTableHead>
              <SortableTableHead
                field="updated"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Last Updated
              </SortableTableHead>
              <TableHead className="normal-case">Updated By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center">
                  <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
                  <p className="text-gray-500">Loading circles...</p>
                </TableCell>
              </TableRow>
            ) : filteredCircles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <p className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                    No circles found
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">
                    {hasActiveFilters
                      ? 'Try adjusting your filters'
                      : 'Get started by adding your first circle'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredCircles.map((circle) => (
                <TableRow key={circle.id}>
                  <TableCell className="font-medium">{circle.name}</TableCell>
                  <TableCell>{circle.description || 'N/A'}</TableCell>
                  <TableCell>{formatDate(circle.created_at)}</TableCell>
                  <TableCell>{circle.updated_at ? formatDate(circle.updated_at) : 'N/A'}</TableCell>
                  <TableCell>{circle.updated_by_username || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(circle)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(circle)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ComponentCard>

      <AdvancedFilterDialog
        isOpen={isFilterDialogOpen}
        onClose={() => setIsFilterDialogOpen(false)}
        onApplyFilters={() => {}}
        filterModel={filterModel}
        onFilterModelChange={setFilterModel}
        fields={circleFilterFields}
        getOperatorsForField={getCircleOperatorsForField}
        getValueInput={getCircleValueInput}
      />

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open && (isCreating || isUpdating)) return
        setIsDialogOpen(open)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCircle ? 'Edit Circle' : 'Add New Circle'}</DialogTitle>
            <DialogDescription>
              {editingCircle ? 'Update circle information' : 'Create a new circle'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input 
                id="description" 
                value={formData.description} 
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value })
                  if (errors.description) {
                    setErrors({ ...errors, description: undefined })
                  }
                }}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isCreating || isUpdating}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingCircle ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingCircle ? 'Update' : 'Create'
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
            <DialogTitle>Delete Circle</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{circleToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDeleteConfirmOpen(false)
              setCircleToDelete(null)
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
                'Delete Circle'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
