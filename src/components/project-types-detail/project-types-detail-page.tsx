'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useProjectTypeDetails } from '@/hooks/use-project-types-detail'
import { useProjectTypes } from '@/hooks/use-project-types'
import { useSteps } from '@/hooks/use-steps'
import { formatDate, CURRENCY_SYMBOL } from '@/lib/utils'
import { ProjectTypeDetail } from '@/types'
import { Search, Plus, Edit, Trash2, Loader2, Filter, X, ArrowUp, ArrowDown, ArrowUpDown, GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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

const projectTypeDetailFilterFields: FilterField[] = [
  { value: 'project_type', label: 'Project Type', type: 'text' },
  { value: 'step', label: 'Step', type: 'text' },
  { value: 'weightage', label: 'Weightage', type: 'text' },
  { value: 't_days', label: 'Time Days', type: 'text' },
  { value: 'est_cost', label: 'Estimated Cost (Budget)', type: 'text' },
  { value: 'created_at', label: 'Created Date', type: 'date' }
]

const getProjectTypeDetailOperatorsForField = (field: string): FilterOperator[] => {
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
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 text-blue-600" /> : <ArrowDown className="h-4 w-4 text-blue-600" />
  }
  return (
    <TableHead className="cursor-pointer select-none hover:bg-gray-50" onClick={() => onSort(field)}>
      <div className="flex items-center space-x-2">
        <span className={isActive ? 'text-blue-600 font-semibold' : 'text-gray-700'}>{children}</span>
        {getSortIcon()}
      </div>
    </TableHead>
  )
}

interface SortableRowProps {
  detail: ProjectTypeDetail
  getProjectTypeName: (ptypeId: number) => string
  getStepName: (stepId: number) => string
  onEdit: (detail: ProjectTypeDetail) => void
  onDelete: (detail: ProjectTypeDetail) => void
}

function SortableRow({ detail, getProjectTypeName, getStepName, onEdit, onDelete }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: detail.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? 'bg-gray-100' : ''}>
      <TableCell className="w-12">
        <div
          className="flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-800 rounded p-2 transition-colors touch-none"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
        >
          <GripVertical className="h-6 w-6 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200" />
        </div>
      </TableCell>
      <TableCell className="font-medium">{getProjectTypeName(detail.ptype_id)}</TableCell>
      <TableCell>{getStepName(detail.s_id)}</TableCell>
      <TableCell>{detail.order}</TableCell>
      <TableCell>{detail.weightage || 0}</TableCell>
      <TableCell>{detail.t_days || 0}</TableCell>
      <TableCell>{CURRENCY_SYMBOL}{(detail.est_cost || 0).toLocaleString()}</TableCell>
      <TableCell>{formatDate(detail.created_at)}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(detail)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(detail)}>
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function ProjectTypesDetailPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterModel, setFilterModel] = useState({
    items: [] as Array<{ id: number; field: string; operator: string; value: any }>,
    logicOperator: 'and' as 'and' | 'or'
  })
  const [sortField, setSortField] = useState<string | null>('order')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDetail, setEditingDetail] = useState<ProjectTypeDetail | null>(null)
  const [formData, setFormData] = useState({ ptype_id: 0, s_id: 0, weightage: '', t_days: '', est_cost: '' })
  const [errors, setErrors] = useState<{ ptype_id?: string; s_id?: string; weightage?: string; t_days?: string; est_cost?: string }>({})

  // Delete confirmation dialog
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [detailToDelete, setDetailToDelete] = useState<ProjectTypeDetail | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { projectTypeDetails, loading, error, createProjectTypeDetail, updateProjectTypeDetail, deleteProjectTypeDetail, refetch } = useProjectTypeDetails({ all: true })
  const { projectTypes } = useProjectTypes({ all: true })
  const { steps } = useSteps({ all: true })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Helper functions to get names
  const getProjectTypeName = (ptypeId: number) => {
    const projectType = projectTypes.find(pt => pt.id === ptypeId)
    return projectType?.name || 'N/A'
  }

  const getStepName = (stepId: number) => {
    const step = steps.find(s => s.id === stepId)
    return step?.name || 'N/A'
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortProjectTypeDetails = useCallback((details: ProjectTypeDetail[], field: string, direction: 'asc' | 'desc') => {
    return [...details].sort((a, b) => {
      let aValue: any, bValue: any
      switch (field) {
        case 'order':
          aValue = a.order || 0
          bValue = b.order || 0
          break
        case 'project_type':
          aValue = getProjectTypeName(a.ptype_id).toLowerCase()
          bValue = getProjectTypeName(b.ptype_id).toLowerCase()
          break
        case 'step':
          aValue = getStepName(a.s_id).toLowerCase()
          bValue = getStepName(b.s_id).toLowerCase()
          break
        case 'weightage':
          aValue = a.weightage || 0
          bValue = b.weightage || 0
          break
        case 't_days':
          aValue = a.t_days || 0
          bValue = b.t_days || 0
          break
        case 'est_cost':
          aValue = a.est_cost || 0
          bValue = b.est_cost || 0
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

  const getProjectTypeDetailFieldValue = (detail: ProjectTypeDetail, field: string) => {
    switch (field) {
      case 'project_type': return getProjectTypeName(detail.ptype_id)
      case 'step': return getStepName(detail.s_id)
      case 'weightage': return detail.weightage?.toString() || '0'
      case 't_days': return detail.t_days?.toString() || '0'
      case 'est_cost': return detail.est_cost?.toString() || '0'
      case 'created_at': return detail.created_at
      default: return ''
    }
  }

  const applyProjectTypeDetailFilterCondition = (fieldValue: any, operator: string, filterValue: any) => {
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

  const filteredProjectTypeDetails = useMemo(() => {
    let filtered = projectTypeDetails
    if (searchTerm) {
      filtered = filtered.filter(detail =>
        getProjectTypeName(detail.ptype_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getStepName(detail.s_id).toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (filterModel.items.length > 0) {
      filtered = filtered.filter(detail => {
        const results = filterModel.items.map(item => {
          const fieldValue = getProjectTypeDetailFieldValue(detail, item.field)
          return applyProjectTypeDetailFilterCondition(fieldValue, item.operator, item.value)
        })
        return filterModel.logicOperator === 'and' ? results.every(r => r) : results.some(r => r)
      })
    }
    if (sortField) {
      filtered = sortProjectTypeDetails(filtered, sortField, sortDirection)
    }
    return filtered
  }, [projectTypeDetails, searchTerm, filterModel, sortField, sortDirection, sortProjectTypeDetails])

  const hasActiveFilters = filterModel.items.length > 0 || searchTerm

  const getProjectTypeDetailValueInput = (field: FilterField, operator: string, value: any, onChange: (value: any) => void) => {
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
    const newErrors: { ptype_id?: string; s_id?: string; weightage?: string; t_days?: string; est_cost?: string } = {}
    
    if (!formData.ptype_id || formData.ptype_id === 0) {
      newErrors.ptype_id = 'Project type is required'
    }
    
    if (!formData.s_id || formData.s_id === 0) {
      newErrors.s_id = 'Step is required'
    }
    
    if (formData.weightage && (isNaN(Number(formData.weightage)) || Number(formData.weightage) < 0)) {
      newErrors.weightage = 'Weightage must be a valid number >= 0'
    }
    
    if (formData.t_days && (isNaN(Number(formData.t_days)) || Number(formData.t_days) < 0)) {
      newErrors.t_days = 'Time days must be a valid number >= 0'
    }
    
    if (formData.est_cost && (isNaN(Number(formData.est_cost)) || Number(formData.est_cost) < 0)) {
      newErrors.est_cost = 'Estimated cost (budget) must be a valid number >= 0'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleOpenDialog = (detail?: ProjectTypeDetail) => {
    if (detail) {
      setEditingDetail(detail)
      setFormData({ 
        ptype_id: detail.ptype_id, 
        s_id: detail.s_id, 
        weightage: detail.weightage?.toString() || '', 
        t_days: detail.t_days?.toString() || '', 
        est_cost: detail.est_cost?.toString() || '' 
      })
    } else {
      setEditingDetail(null)
      setFormData({ ptype_id: 0, s_id: 0, weightage: '', t_days: '', est_cost: '' })
    }
    setErrors({})
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingDetail(null)
    setFormData({ ptype_id: 0, s_id: 0, weightage: '', t_days: '', est_cost: '' })
    setErrors({})
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }
    
    // Get max order for new items
    const maxOrder = projectTypeDetails
      .filter(d => d.ptype_id === formData.ptype_id)
      .reduce((max, d) => Math.max(max, d.order || 0), 0)

    const submitData = {
      ptype_id: formData.ptype_id,
      s_id: formData.s_id,
      weightage: formData.weightage ? Number(formData.weightage) : undefined,
      t_days: formData.t_days ? Number(formData.t_days) : undefined,
      est_cost: formData.est_cost ? Number(formData.est_cost) : undefined,
      order: editingDetail ? undefined : maxOrder + 1,
    }
    
    try {
      if (editingDetail) {
        await updateProjectTypeDetail(editingDetail.id, submitData)
      } else {
        await createProjectTypeDetail(submitData)
      }
      handleCloseDialog()
    } catch (error) {
      console.error('Failed to save project type detail:', error)
      // Hook already set error; it will show in the list view
    }
  }

  const handleDelete = (detail: ProjectTypeDetail) => {
    setDetailToDelete(detail)
    setIsDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!detailToDelete) return
    try {
      setIsDeleting(true)
      await deleteProjectTypeDetail(detailToDelete.id)
      setIsDeleteConfirmOpen(false)
      setDetailToDelete(null)
    } catch (error) {
      console.error('Failed to delete project type detail:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const activeDetail = filteredProjectTypeDetails.find((detail) => detail.id === active.id)
    const overDetail = filteredProjectTypeDetails.find((detail) => detail.id === over.id)

    if (!activeDetail || !overDetail) {
      return
    }

    // Only allow reordering within the same project type
    if (activeDetail.ptype_id !== overDetail.ptype_id) {
      return
    }

    // Get all details for the same project type from the full list, sorted by order
    const sameProjectTypeDetails = projectTypeDetails
      .filter((detail) => detail.ptype_id === activeDetail.ptype_id)
      .sort((a, b) => (a.order || 0) - (b.order || 0))

    // Find indices in the same project type list
    const oldIndex = sameProjectTypeDetails.findIndex((detail) => detail.id === active.id)
    const newIndex = sameProjectTypeDetails.findIndex((detail) => detail.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    // Reorder within the same project type
    const reorderedDetails = arrayMove(sameProjectTypeDetails, oldIndex, newIndex)

    // Update order for all items in the same project type
    const updates = reorderedDetails.map((detail, index) => ({
      id: detail.id,
      order: index + 1,
    }))

    try {
      // Update all items with new order values
      for (const update of updates) {
        await updateProjectTypeDetail(update.id, { order: update.order })
      }
      // Refetch to get updated data
      await refetch()
    } catch (err) {
      console.error('Failed to save order:', err)
      // Hook already set error; it will show in the list view
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Project Types Detail</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage project type details, steps, and configurations</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Project Type Detail
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Type Detail Management</CardTitle>
          <CardDescription>Search and filter your project type details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search project type details..."
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

          <div className="rounded-md border">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <SortableTableHead field="project_type" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                      Project Type
                    </SortableTableHead>
                    <SortableTableHead field="step" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                      Step
                    </SortableTableHead>
                    <SortableTableHead field="order" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                      Order
                    </SortableTableHead>
                    <SortableTableHead field="weightage" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                      Weightage
                    </SortableTableHead>
                    <SortableTableHead field="t_days" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                      Time Days
                    </SortableTableHead>
                    <SortableTableHead field="est_cost" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                      Est. Cost (Budget)
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
                      <TableCell colSpan={9} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <p className="text-gray-500">Loading project type details...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredProjectTypeDetails.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <p className="text-lg font-medium text-gray-900 mb-2">No project type details found</p>
                        <p className="text-gray-500">{hasActiveFilters ? 'Try adjusting your filters' : 'Get started by adding your first project type detail'}</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <SortableContext
                      items={filteredProjectTypeDetails.map((detail) => detail.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {filteredProjectTypeDetails.map((detail) => (
                        <SortableRow
                          key={detail.id}
                          detail={detail}
                          getProjectTypeName={getProjectTypeName}
                          getStepName={getStepName}
                          onEdit={handleOpenDialog}
                          onDelete={handleDelete}
                        />
                      ))}
                    </SortableContext>
                  )}
                </TableBody>
              </Table>
            </DndContext>
          </div>
        </CardContent>
      </Card>

      <AdvancedFilterDialog
        isOpen={isFilterDialogOpen}
        onClose={() => setIsFilterDialogOpen(false)}
        onApplyFilters={() => {}}
        filterModel={filterModel}
        onFilterModelChange={setFilterModel}
        fields={projectTypeDetailFilterFields}
        getOperatorsForField={getProjectTypeDetailOperatorsForField}
        getValueInput={getProjectTypeDetailValueInput}
      />

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        // This page doesn't have create/edit operations, but keep for consistency
        setIsDialogOpen(open)
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingDetail ? 'Edit Project Type Detail' : 'Add New Project Type Detail'}</DialogTitle>
            <DialogDescription>
              {editingDetail ? 'Update project type detail information' : 'Create a new project type detail'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ptype_id">Project Type <span className="text-red-500">*</span></Label>
              <Select
                value={formData.ptype_id.toString()}
                onValueChange={(value) => {
                  setFormData({ ...formData, ptype_id: Number(value) })
                  if (errors.ptype_id) {
                    setErrors({ ...errors, ptype_id: undefined })
                  }
                }}
              >
                <SelectTrigger className={errors.ptype_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  {projectTypes.map((pt) => (
                    <SelectItem key={pt.id} value={pt.id.toString()}>
                      {pt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.ptype_id && (
                <p className="text-sm text-red-500">{errors.ptype_id}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="s_id">Step <span className="text-red-500">*</span></Label>
              <Select
                value={formData.s_id.toString()}
                onValueChange={(value) => {
                  setFormData({ ...formData, s_id: Number(value) })
                  if (errors.s_id) {
                    setErrors({ ...errors, s_id: undefined })
                  }
                }}
              >
                <SelectTrigger className={errors.s_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select step" />
                </SelectTrigger>
                <SelectContent>
                  {steps.map((step) => (
                    <SelectItem key={step.id} value={step.id.toString()}>
                      {step.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.s_id && (
                <p className="text-sm text-red-500">{errors.s_id}</p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weightage">Weightage</Label>
                <Input 
                  id="weightage" 
                  type="number"
                  step="1"
                  min="0"
                  value={formData.weightage} 
                  onChange={(e) => {
                    setFormData({ ...formData, weightage: e.target.value })
                    if (errors.weightage) {
                      setErrors({ ...errors, weightage: undefined })
                    }
                  }}
                  className={errors.weightage ? 'border-red-500' : ''}
                  placeholder="0"
                />
                {errors.weightage && (
                  <p className="text-sm text-red-500">{errors.weightage}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="t_days">Time Days</Label>
                <Input 
                  id="t_days" 
                  type="number"
                  step="1"
                  min="0"
                  value={formData.t_days} 
                  onChange={(e) => {
                    setFormData({ ...formData, t_days: e.target.value })
                    if (errors.t_days) {
                      setErrors({ ...errors, t_days: undefined })
                    }
                  }}
                  className={errors.t_days ? 'border-red-500' : ''}
                  placeholder="0"
                />
                {errors.t_days && (
                  <p className="text-sm text-red-500">{errors.t_days}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="est_cost">Estimated Cost (Budget)</Label>
                <Input 
                  id="est_cost" 
                  type="number"
                  step="1"
                  min="0"
                  value={formData.est_cost} 
                  onChange={(e) => {
                    setFormData({ ...formData, est_cost: e.target.value })
                    if (errors.est_cost) {
                      setErrors({ ...errors, est_cost: undefined })
                    }
                  }}
                  className={errors.est_cost ? 'border-red-500' : ''}
                  placeholder="0"
                />
                {errors.est_cost && (
                  <p className="text-sm text-red-500">{errors.est_cost}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingDetail ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={(open) => {
        if (!open && isDeleting) return
        setIsDeleteConfirmOpen(open)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project Type Detail</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the step <strong>{detailToDelete ? getStepName(detailToDelete.s_id) : 'this step'}</strong> for project type <strong>{detailToDelete ? getProjectTypeName(detailToDelete.ptype_id) : 'this project type'}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDeleteConfirmOpen(false)
              setDetailToDelete(null)
            }}>
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
                'Delete Detail'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

