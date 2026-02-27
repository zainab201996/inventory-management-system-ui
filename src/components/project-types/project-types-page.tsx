'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useProjectTypes } from '@/hooks/use-project-types'
import { useProjectTypeDetails } from '@/hooks/use-project-types-detail'
import { useSteps } from '@/hooks/use-steps'
import { useUserAccess } from '@/hooks/use-user-access'
import { useDepartments } from '@/hooks/use-departments'
import { formatDate, CURRENCY_SYMBOL, cn, getUserFriendlyApiErrorMessage } from '@/lib/utils'
import { ProjectType, ProjectTypeDetail, PTSDetail } from '@/types'
import { Search, Plus, Edit, Trash2, Loader2, Filter, X, ArrowUp, ArrowDown, ArrowUpDown, ChevronRight, Layers, GripVertical, ChevronDown, Hash, Calendar, FileText, List } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import Checkbox from '@/components/ui/checkbox'
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

const projectTypeFilterFields: FilterField[] = [
  { value: 'name', label: 'Name', type: 'text' },
  { value: 'created_at', label: 'Created Date', type: 'date' }
]

const getProjectTypeOperatorsForField = (field: string): FilterOperator[] => {
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

interface SortableDetailRowProps {
  detail: ProjectTypeDetail
  index: number
  getStepName: (stepId: number) => string
  onEdit: (detail: ProjectTypeDetail) => void
  onDelete: (detail: ProjectTypeDetail) => void
  prerequisiteSteps?: PTSDetail[]
  isExpanded?: boolean
  onToggleExpand?: () => void
}

interface SortableCombinedStepProps {
  step: {
    id: string
    ptd_id?: number
    s_id: number
    prerequisites: number[]
  }
  index: number
  stepErrors: { s_id?: string }
  combinedSteps: Array<{
    id: string
    ptd_id?: number
    s_id: number
    prerequisites: number[]
  }>
  steps: Array<{ id: number; name: string }>
  getStepName: (stepId: number) => string
  onStepChange: (stepId: string, field: 's_id', value: string | number) => void
  onPrerequisiteChange: (stepId: string, prerequisiteStepId: number, checked: boolean) => void
  onRemove: (stepId: string) => void
}

function SortableCombinedStep({ step, index, stepErrors, combinedSteps, steps, getStepName, onStepChange, onPrerequisiteChange, onRemove }: SortableCombinedStepProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Available steps for prerequisites (only steps before this one)
  const availablePrerequisiteSteps = combinedSteps.slice(0, index).filter(s => s.s_id > 0)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4 bg-gray-50 dark:bg-gray-900/50 ${isDragging ? 'ring-2 ring-blue-500' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-2 transition-colors touch-none"
            {...attributes}
            {...listeners}
            title="Drag to reorder"
          >
            <GripVertical className="h-5 w-5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Order:</span>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
              {index + 1}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Step {index + 1}</span>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(step.id)}
          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`combined-step-${step.id}`}>Step <span className="text-red-500">*</span></Label>
        <Select
          value={step.s_id.toString()}
          onValueChange={(value) => {
            onStepChange(step.id, 's_id', Number(value))
          }}
        >
          <SelectTrigger className={stepErrors.s_id ? 'border-red-500' : ''} id={`combined-step-${step.id}`}>
            <SelectValue placeholder="Select step" />
          </SelectTrigger>
          <SelectContent 
            position="popper"
            sideOffset={4}
            collisionPadding={8}
            className="max-h-[200px]"
          >
            {steps.map((s) => {
              // Check if this step is already used in another entry
              const isAlreadyUsed = combinedSteps.some(st => st.id !== step.id && st.s_id === s.id)
              return (
                <SelectItem 
                  key={s.id} 
                  value={s.id.toString()}
                  disabled={isAlreadyUsed}
                >
                  {s.name}
                  {isAlreadyUsed && <span className="text-gray-400 dark:text-gray-500 ml-2">(already added)</span>}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        {stepErrors.s_id && (
          <p className="text-sm text-red-500">{stepErrors.s_id}</p>
        )}
      </div>

      {/* Prerequisites - only show if there are previous steps */}
      {availablePrerequisiteSteps.length > 0 && (
        <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">
          <Label>Required Steps (Prerequisites)</Label>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-h-40 overflow-y-auto custom-scrollbar">
            <div className="space-y-2">
              {availablePrerequisiteSteps.map((prereqStep) => {
                const prereqStepName = getStepName(prereqStep.s_id)
                return (
                  <div key={prereqStep.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={step.prerequisites.includes(prereqStep.s_id)}
                      onChange={(checked: boolean) => {
                        onPrerequisiteChange(step.id, prereqStep.s_id, checked)
                      }}
                      label={prereqStepName}
                    />
                  </div>
                )
              })}
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Select steps that must be completed before this step can be started.
          </p>
        </div>
      )}
    </div>
  )
}

function SortableDetailRow({ detail, index, getStepName, onEdit, onDelete, prerequisiteSteps = [], isExpanded = false, onToggleExpand }: SortableDetailRowProps) {
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

  const hasPrerequisites = prerequisiteSteps.length > 0

  return (
    <>
      <TableRow ref={setNodeRef} style={style} className={isDragging ? 'bg-gray-100 dark:bg-gray-800' : ''}>
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
        <TableCell>{index + 1}</TableCell>
        <TableCell className="font-medium min-w-[200px]">
          <div className="flex items-center gap-2">
            {hasPrerequisites && (
              <button
                onClick={onToggleExpand}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                title={isExpanded ? 'Collapse prerequisites' : 'Expand prerequisites'}
              >
                <ChevronRight 
                  className={cn(
                    "h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform",
                    isExpanded && "transform rotate-90"
                  )} 
                />
              </button>
            )}
            {getStepName(detail.s_id)}
            {hasPrerequisites && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({prerequisiteSteps.length} prerequisite{prerequisiteSteps.length !== 1 ? 's' : ''})
              </span>
            )}
          </div>
        </TableCell>
        <TableCell>{formatDate(detail.created_at)}</TableCell>
        <TableCell className="text-right hidden">
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
      {hasPrerequisites && isExpanded && prerequisiteSteps.map((pts) => (
        <TableRow key={pts.ptsd_id} className="bg-gray-50 dark:bg-gray-900/50">
          <TableCell></TableCell>
          <TableCell></TableCell>
          <TableCell className="pl-8 min-w-[200px]">
            <div className="flex items-center gap-2">
              <div className="w-4 h-px bg-gray-300 dark:bg-gray-600"></div>
              <ChevronRight className="h-3 w-3 text-gray-400 dark:text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {getStepName(pts.step_id)}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 italic">(required)</span>
            </div>
          </TableCell>
          <TableCell colSpan={2}></TableCell>
        </TableRow>
      ))}
    </>
  )
}

function SortableTableHead({ field, children, sortField, sortDirection, onSort }: SortableTableHeadProps) {
  const isActive = sortField === field
  const getSortIcon = () => {
    if (!isActive) return <ArrowUpDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 text-blue-600 dark:text-blue-400" /> : <ArrowDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
  }
  return (
    <TableHead className="cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => onSort(field)}>
      <div className="flex items-center space-x-2">
        <span className={isActive ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}>{children}</span>
        {getSortIcon()}
      </div>
    </TableHead>
  )
}

export function ProjectTypesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterModel, setFilterModel] = useState({
    items: [] as Array<{ id: number; field: string; operator: string; value: any }>,
    logicOperator: 'and' as 'and' | 'or'
  })
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  // Combined dialog state (for creating/editing project type with details)
  const [isCombinedDialogOpen, setIsCombinedDialogOpen] = useState(false)
  const [editingProjectTypeCombined, setEditingProjectTypeCombined] = useState<ProjectType | null>(null)
  const [combinedFormData, setCombinedFormData] = useState({ name: '', department_id: 0 })
  const [combinedSteps, setCombinedSteps] = useState<Array<{ 
    id: string; 
    ptd_id?: number; // For editing existing details
    s_id: number; 
    prerequisites: number[];
  }>>([])
  // Store original data for comparison (to skip unnecessary updates)
  const [originalProjectTypeName, setOriginalProjectTypeName] = useState<string>('')
  const [originalStepsData, setOriginalStepsData] = useState<Map<number, { s_id: number; order: number; prerequisites: number[] }>>(new Map())
  const [combinedErrors, setCombinedErrors] = useState<{ 
    name?: string;
    department_id?: string;
    steps?: Record<string, { s_id?: string }> 
  }>({})
  const [isCreatingCombined, setIsCreatingCombined] = useState(false)
  const [isUpdatingCombined, setIsUpdatingCombined] = useState(false)
  const [isReorderingSteps, setIsReorderingSteps] = useState(false)
  const [combinedSubmitError, setCombinedSubmitError] = useState<string | null>(null)
  
  // Master-Detail state
  const [selectedProjectType, setSelectedProjectType] = useState<ProjectType | null>(null)
  const [ptsDetailsMap, setPtsDetailsMap] = useState<Map<number, PTSDetail[]>>(new Map())
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [localOrderedDetails, setLocalOrderedDetails] = useState<ProjectTypeDetail[]>([])
  const [originalOrder, setOriginalOrder] = useState<Map<number, number>>(new Map())
  const prevProjectTypeIdRef = useRef<number | null>(null)
  const initializedForProjectTypeRef = useRef<number | null>(null)
  const lastInitializedDataRef = useRef<Set<number>>(new Set())

  // Delete confirmation dialogs
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [projectTypeToDelete, setProjectTypeToDelete] = useState<ProjectType | null>(null)
  const [isDeleteDetailConfirmOpen, setIsDeleteDetailConfirmOpen] = useState(false)
  const [detailToDelete, setDetailToDelete] = useState<ProjectTypeDetail | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSavingOrder, setIsSavingOrder] = useState(false)

  const { projectTypes, loading, error, createProjectType, updateProjectType, deleteProjectType, refetch: refetchProjectTypes } = useProjectTypes({ all: true })
  const { projectTypeDetails, loading: detailsLoading, error: detailsError, createProjectTypeDetail, updateProjectTypeDetail, deleteProjectTypeDetail, refetch: refetchDetails } = useProjectTypeDetails({ ptype_id: selectedProjectType?.id, all: true })
  const { steps } = useSteps({ all: true })
  const { access } = useUserAccess()
  const userId = access?.user?.id
  const { departments, loading: departmentsLoading } = useDepartments({ all: true })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  
  // Get details for selected project type, sorted by order
  const selectedProjectTypeDetails = useMemo(() => {
    if (!selectedProjectType) return []
    return projectTypeDetails
      .filter(detail => detail.ptype_id === selectedProjectType.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
  }, [projectTypeDetails, selectedProjectType])

  // Initialize local ordered details when project type changes or when data loads
  useEffect(() => {
    const currentProjectTypeId = selectedProjectType?.id ?? null
    const projectTypeChanged = prevProjectTypeIdRef.current !== currentProjectTypeId
    
    // If project type changed, always clear local state immediately
    if (projectTypeChanged) {
      setLocalOrderedDetails([])
      setOriginalOrder(new Map())
      initializedForProjectTypeRef.current = null
      lastInitializedDataRef.current = new Set()
      prevProjectTypeIdRef.current = currentProjectTypeId
    }
    
    // Initialize with data if available
    if (currentProjectTypeId !== null && selectedProjectTypeDetails.length > 0) {
      // Get current data IDs
      const currentIds = new Set(selectedProjectTypeDetails.map(d => d.id))
      const currentIdsArray = [...currentIds].sort()
      const lastIdsArray = [...lastInitializedDataRef.current].sort()
      
      // Check if data has changed by comparing IDs
      const dataChanged = lastInitializedDataRef.current.size === 0 ||
                         lastInitializedDataRef.current.size !== currentIds.size ||
                         JSON.stringify(lastIdsArray) !== JSON.stringify(currentIdsArray)
      
      // Check if we need to initialize (project type changed or data changed)
      // Only skip if data hasn't changed AND we've already initialized for this project type
      const needsInitialization = initializedForProjectTypeRef.current !== currentProjectTypeId || dataChanged
      
      // But don't overwrite if user has made order changes (check this by reading current state)
      // We need to check this carefully - only prevent overwrite if:
      // 1. We have local state
      // 2. IDs match (same items)
      // 3. User has reordered (positions differ)
      let shouldPreventOverwrite = false
      if (localOrderedDetails.length > 0 && 
          localOrderedDetails.length === selectedProjectTypeDetails.length &&
          initializedForProjectTypeRef.current === currentProjectTypeId) {
        const localIds = new Set(localOrderedDetails.map(d => d.id))
        const allIdsMatch = localIds.size === currentIds.size && 
                           [...localIds].every(id => currentIds.has(id))
        
        if (allIdsMatch) {
          // Check if positions are different (user reordered)
          const positionsDiffer = localOrderedDetails.some((detail, index) => {
            const originalIndex = selectedProjectTypeDetails.findIndex(d => d.id === detail.id)
            return originalIndex !== -1 && originalIndex !== index
          })
          shouldPreventOverwrite = positionsDiffer
        }
      }
      
      if (needsInitialization && !shouldPreventOverwrite) {
        const sortedDetails = [...selectedProjectTypeDetails].sort((a, b) => (a.order || 0) - (b.order || 0))
        setLocalOrderedDetails(sortedDetails)
        const orderMap = new Map<number, number>()
        sortedDetails.forEach((detail) => {
          orderMap.set(detail.id, detail.order || 0)
        })
        setOriginalOrder(orderMap)
        initializedForProjectTypeRef.current = currentProjectTypeId
        lastInitializedDataRef.current = new Set(currentIds)
      }
    } else if (currentProjectTypeId === null) {
      // Project type cleared
      setLocalOrderedDetails([])
      setOriginalOrder(new Map())
      initializedForProjectTypeRef.current = null
      lastInitializedDataRef.current = new Set()
      prevProjectTypeIdRef.current = null
    } else if (currentProjectTypeId !== null && selectedProjectTypeDetails.length === 0) {
      // Data cleared for current project type
      setLocalOrderedDetails([])
      setOriginalOrder(new Map())
      lastInitializedDataRef.current = new Set()
    }
  }, [selectedProjectType?.id, selectedProjectTypeDetails])

  // Check if order has changed by comparing current positions with original positions
  const hasOrderChanged = useMemo(() => {
    if (localOrderedDetails.length === 0 || selectedProjectTypeDetails.length === 0) return false
    if (localOrderedDetails.length !== selectedProjectTypeDetails.length) return false
    
    // First check if IDs match
    const localIds = new Set(localOrderedDetails.map(d => d.id))
    const selectedIds = new Set(selectedProjectTypeDetails.map(d => d.id))
    if (localIds.size !== selectedIds.size || ![...localIds].every(id => selectedIds.has(id))) {
      return false // Different items, not an order change
    }
    
    // Compare each detail's current position with its original position in the sorted array
    return localOrderedDetails.some((detail, currentIndex) => {
      const originalIndex = selectedProjectTypeDetails.findIndex(d => d.id === detail.id)
      return originalIndex !== -1 && currentIndex !== originalIndex
    })
  }, [localOrderedDetails, selectedProjectTypeDetails])

  // Helper function to get step name
  // First tries to get from projectTypeDetails (which includes step info from API)
  // Then checks PTSDetails (for prerequisites)
  // Falls back to steps array (for dialog dropdown)
  const getStepName = (stepId: number) => {
    // First check if step info is available in projectTypeDetails
    const detailWithStep = projectTypeDetails.find(d => d.s_id === stepId && d.step)
    if (detailWithStep?.step) {
      return detailWithStep.step.name || 'N/A'
    }
    
    // Check PTSDetails (for prerequisites)
    for (const ptsDetails of ptsDetailsMap.values()) {
      const ptsDetail = ptsDetails.find(pts => pts.step_id === stepId && pts.step)
      if (ptsDetail?.step) {
        return ptsDetail.step.name || 'N/A'
      }
    }
    
    // Fallback to steps array (for dialog or when step info not in details)
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

  const sortProjectTypes = useCallback((projectTypes: ProjectType[], field: string, direction: 'asc' | 'desc') => {
    return [...projectTypes].sort((a, b) => {
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

  const getProjectTypeFieldValue = (projectType: ProjectType, field: string) => {
    switch (field) {
      case 'name': return projectType.name || ''
      case 'created_at': return projectType.created_at
      default: return ''
    }
  }

  const applyProjectTypeFilterCondition = (fieldValue: any, operator: string, filterValue: any) => {
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

  const filteredProjectTypes = useMemo(() => {
    let filtered = projectTypes
    if (searchTerm) {
      filtered = filtered.filter(projectType =>
        projectType.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (filterModel.items.length > 0) {
      filtered = filtered.filter(projectType => {
        const results = filterModel.items.map(item => {
          const fieldValue = getProjectTypeFieldValue(projectType, item.field)
          return applyProjectTypeFilterCondition(fieldValue, item.operator, item.value)
        })
        return filterModel.logicOperator === 'and' ? results.every(r => r) : results.some(r => r)
      })
    }
    if (sortField) {
      filtered = sortProjectTypes(filtered, sortField, sortDirection)
    }
    return filtered
  }, [projectTypes, searchTerm, filterModel, sortField, sortDirection, sortProjectTypes])

  const hasActiveFilters = filterModel.items.length > 0 || searchTerm

  const getProjectTypeValueInput = (field: FilterField, operator: string, value: any, onChange: (value: any) => void) => {
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

  // Combined dialog handlers (for create and edit)
  const handleOpenCombinedDialog = async (projectType?: ProjectType) => {
    if (projectType) {
      // Edit mode - load existing project type and its details
      setEditingProjectTypeCombined(projectType)
      setCombinedFormData({ name: projectType.name, department_id: projectType.department_id || 0 })
      
      // Fetch details for this project type
      const detailsResponse = await apiClient.getProjectTypeDetails({ ptype_id: projectType.id, all: true })
      const allDetails = detailsResponse.success && detailsResponse.data 
        ? (Array.isArray(detailsResponse.data) ? detailsResponse.data : (detailsResponse.data as any).details || [])
        : []
      
      // Sort by order
      const sortedDetails = [...allDetails].sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
      
      // Load steps with prerequisites
      const loadedSteps = await Promise.all(sortedDetails.map(async (detail: any) => {
        const ptsDetails = await fetchPTSDetails(detail.id || detail.ptd_id)
        return {
          id: `step-${detail.id || detail.ptd_id}`,
          ptd_id: detail.id || detail.ptd_id,
          s_id: detail.s_id,
          prerequisites: ptsDetails.map((pts: any) => pts.step_id)
        }
      }))
      
      setCombinedSteps(loadedSteps)
      
      // Store original data for comparison
      setOriginalProjectTypeName(projectType.name)
      const originalDataMap = new Map<number, { s_id: number; order: number; prerequisites: number[] }>()
      sortedDetails.forEach((detail: any, index: number) => {
        const detailId = detail.id || detail.ptd_id
        const ptsDetails = loadedSteps.find(s => s.ptd_id === detailId)
        originalDataMap.set(detailId, {
          s_id: detail.s_id,
          order: index + 1,
          prerequisites: ptsDetails?.prerequisites || []
        })
      })
      setOriginalStepsData(originalDataMap)
    } else {
      // Create mode
      setEditingProjectTypeCombined(null)
      setCombinedFormData({ name: '', department_id: 0 })
      setCombinedSteps([])
      setOriginalProjectTypeName('')
      setOriginalStepsData(new Map())
    }
    setCombinedErrors({})
    setCombinedSubmitError(null)
    setIsCombinedDialogOpen(true)
  }

  const handleCloseCombinedDialog = () => {
    if (isCreatingCombined || isUpdatingCombined) return
    setIsCombinedDialogOpen(false)
    setEditingProjectTypeCombined(null)
    setCombinedFormData({ name: '', department_id: 0 })
    setCombinedSteps([])
    setCombinedErrors({})
    setCombinedSubmitError(null)
    setOriginalProjectTypeName('')
    setOriginalStepsData(new Map())
  }

  const handleAddCombinedStep = () => {
    const newStep = {
      id: `step-${Date.now()}-${Math.random()}`,
      s_id: 0,
      prerequisites: []
    }
    setCombinedSteps([...combinedSteps, newStep])
  }

  const handleRemoveCombinedStep = (stepId: string) => {
    setCombinedSteps(combinedSteps.filter(step => step.id !== stepId))
    // Clear errors for this step
    if (combinedErrors.steps?.[stepId]) {
      const newErrors = { ...combinedErrors }
      delete newErrors.steps![stepId]
      if (Object.keys(newErrors.steps || {}).length === 0) {
        delete newErrors.steps
      }
      setCombinedErrors(newErrors)
    }
  }

  const handleCombinedStepChange = (stepId: string, field: 's_id', value: string | number) => {
    const sIdValue = typeof value === 'string' ? Number(value) : value
    setCombinedSteps(combinedSteps.map(step => {
      if (step.id === stepId) {
        const updated = { ...step, [field]: sIdValue }
        // Clear prerequisites if step changes
        if (field === 's_id') {
          updated.prerequisites = []
        }
        return updated
      }
      return step
    }))
    // Clear error for this field
    if (combinedErrors.steps?.[stepId]?.[field]) {
      const newErrors = { ...combinedErrors }
      if (newErrors.steps?.[stepId]) {
        delete newErrors.steps[stepId][field]
        if (Object.keys(newErrors.steps[stepId]).length === 0) {
          delete newErrors.steps[stepId]
        }
      }
      if (newErrors.steps && Object.keys(newErrors.steps).length === 0) {
        delete newErrors.steps
      }
      setCombinedErrors(newErrors)
    }
  }

  const handleCombinedPrerequisiteChange = (stepId: string, prerequisiteStepId: number, checked: boolean) => {
    setCombinedSteps(combinedSteps.map(step => {
      if (step.id === stepId) {
        if (checked) {
          return { ...step, prerequisites: [...step.prerequisites, prerequisiteStepId] }
        } else {
          return { ...step, prerequisites: step.prerequisites.filter(id => id !== prerequisiteStepId) }
        }
      }
      return step
    }))
  }

  const handleCombinedDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = combinedSteps.findIndex((step) => step.id === active.id)
    const newIndex = combinedSteps.findIndex((step) => step.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    // Show loading state to prevent flicker during re-render
    setIsReorderingSteps(true)

    // Reorder the steps
    const reorderedSteps = arrayMove(combinedSteps, oldIndex, newIndex)
    setCombinedSteps(reorderedSteps)

    // Hide loading state after render completes
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsReorderingSteps(false)
      })
    })
  }

  const validateCombinedForm = () => {
    const newErrors: { 
      name?: string;
      department_id?: string;
      steps?: Record<string, { s_id?: string }> 
    } = {}
    
    // Validate project type name
    if (!combinedFormData.name.trim()) {
      newErrors.name = 'Name is required'
    } else if (combinedFormData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    } else if (combinedFormData.name.trim().length > 100) {
      newErrors.name = 'Name must be less than 100 characters'
    }
    
    // Validate department (only required when creating, not editing)
    if (!editingProjectTypeCombined && (!combinedFormData.department_id || combinedFormData.department_id <= 0)) {
      newErrors.department_id = 'Department is required'
    }
    
    // Validate steps
    if (combinedSteps.length === 0) {
      newErrors.steps = { _general: { s_id: 'At least one step is required' } }
    } else {
      const stepErrors: Record<string, { s_id?: string }> = {}
      const usedStepIds = new Set<number>()
      
      combinedSteps.forEach((step) => {
        const stepError: { s_id?: string } = {}
        
        // Validate step selection
        if (!step.s_id || step.s_id === 0) {
          stepError.s_id = 'Step is required'
        } else if (usedStepIds.has(step.s_id)) {
          stepError.s_id = 'This step is already added'
        } else {
          usedStepIds.add(step.s_id)
        }
        
        if (Object.keys(stepError).length > 0) {
          stepErrors[step.id] = stepError
        }
      })
      
      if (Object.keys(stepErrors).length > 0) {
        newErrors.steps = stepErrors
      }
    }
    
    setCombinedErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmitCombined = async () => {
    if (!validateCombinedForm()) {
      return
    }
    setCombinedSubmitError(null)
    
    try {
      if (editingProjectTypeCombined) {
        setIsUpdatingCombined(true)
      } else {
        setIsCreatingCombined(true)
      }
      
      let projectType: ProjectType
      
      if (editingProjectTypeCombined) {
        // Edit mode
        // Step 1: Update the project type name (only if changed)
        if (combinedFormData.name !== originalProjectTypeName) {
          const updatedProjectType = await updateProjectType(editingProjectTypeCombined.id, { ptype_name: combinedFormData.name })
          if (!updatedProjectType || !updatedProjectType.id) {
            throw new Error('Failed to update project type')
          }
          projectType = updatedProjectType
        } else {
          projectType = editingProjectTypeCombined
        }
        
        // Step 2: Get existing details
        const detailsResponse = await apiClient.getProjectTypeDetails({ ptype_id: projectType.id, all: true })
        const existingDetails = detailsResponse.success && detailsResponse.data 
          ? (Array.isArray(detailsResponse.data) ? detailsResponse.data : (detailsResponse.data as any).details || [])
          : []
        
        const existingDetailIds = new Set(existingDetails.map((d: any) => d.id || d.ptd_id))
        const currentStepIds = new Set(combinedSteps.filter(s => s.ptd_id).map(s => s.ptd_id!))
        
        // Step 3: Delete removed details
        for (const existingDetail of existingDetails) {
          const detailId = existingDetail.id || existingDetail.ptd_id
          if (!currentStepIds.has(detailId)) {
            await deleteProjectTypeDetail(detailId)
          }
        }
        
        // Step 4: Update or create details (only if changed) - API allows weightage, t_days, est_cost to be optional, so we don't send them
        for (let i = 0; i < combinedSteps.length; i++) {
          const step = combinedSteps[i]
          const newOrder = i + 1
          
          if (step.ptd_id && existingDetailIds.has(step.ptd_id)) {
            // Check if detail has changed
            const originalData = originalStepsData.get(step.ptd_id)
            if (originalData) {
              const hasChanged = 
                originalData.s_id !== step.s_id ||
                originalData.order !== newOrder
              
              if (hasChanged) {
                const submitData: { ptype_id: number; s_id: number; order: number } = {
                  ptype_id: projectType.id,
                  s_id: step.s_id,
                  order: newOrder,
                }
                await updateProjectTypeDetail(step.ptd_id, submitData)
              }
            } else {
              const submitData: { ptype_id: number; s_id: number; order: number } = {
                ptype_id: projectType.id,
                s_id: step.s_id,
                order: newOrder,
              }
              await updateProjectTypeDetail(step.ptd_id, submitData)
            }
          } else {
            const submitData: { ptype_id: number; s_id: number; order: number } = {
              ptype_id: projectType.id,
              s_id: step.s_id,
              order: newOrder,
            }
            await createProjectTypeDetail(submitData)
          }
        }
        
        // Step 5: Update prerequisites - only fetch details if we need to (after creating new details)
        // Check if any new details were created
        const hasNewDetails = combinedSteps.some(step => !step.ptd_id || !existingDetailIds.has(step.ptd_id))
        let allDetails = existingDetails
        if (hasNewDetails) {
          // Only refetch if we created new details (to get their IDs)
          await refetchDetails()
          const updatedDetailsResponse = await apiClient.getProjectTypeDetails({ ptype_id: projectType.id, all: true })
          allDetails = updatedDetailsResponse.success && updatedDetailsResponse.data 
            ? (Array.isArray(updatedDetailsResponse.data) ? updatedDetailsResponse.data : (updatedDetailsResponse.data as any).details || [])
            : []
        }
        
        // Update PTS details for each step
        for (let i = 0; i < combinedSteps.length; i++) {
          const step = combinedSteps[i]
          const detail = allDetails.find((d: any) => {
            // Match by s_id and order, or by ptd_id if available
            if (step.ptd_id) {
              return (d.id || d.ptd_id) === step.ptd_id
            }
            return d.s_id === step.s_id && d.ptype_id === projectType.id
          })
          
          if (detail) {
            const ptdId = detail.id || detail.ptd_id
            if (!ptdId) continue
            
            // Get original prerequisites for this step
            const originalData = originalStepsData.get(step.ptd_id || ptdId)
            const originalPrerequisiteStepIds = originalData ? new Set(originalData.prerequisites) : new Set<number>()
            const newPrerequisiteStepIds = new Set(step.prerequisites)
            
            // Check if prerequisites have changed
            const prerequisitesChanged = 
              originalPrerequisiteStepIds.size !== newPrerequisiteStepIds.size ||
              ![...originalPrerequisiteStepIds].every(id => newPrerequisiteStepIds.has(id)) ||
              ![...newPrerequisiteStepIds].every(id => originalPrerequisiteStepIds.has(id))
            
            if (prerequisitesChanged) {
              // Get existing PTS details
              const existingPTS = await fetchPTSDetails(ptdId)
              const existingPrerequisiteStepIds = new Set(existingPTS.map((pts: any) => pts.step_id))
              
              // Delete removed prerequisites
              for (const pts of existingPTS) {
                if (!newPrerequisiteStepIds.has(pts.step_id)) {
                  await apiClient.deletePTSDetail(ptdId, pts.ptsd_id)
                }
              }
              
              // Add new prerequisites
              for (const prerequisiteStepId of step.prerequisites) {
                if (!existingPrerequisiteStepIds.has(prerequisiteStepId)) {
                  await apiClient.createPTSDetail(ptdId, prerequisiteStepId)
                }
              }
            }
          }
        }
      } else {
        // Create mode
        // Step 1: Create the project type
        const createdProjectType = await createProjectType({ 
          ptype_name: combinedFormData.name,
          department_id: combinedFormData.department_id
        })
        if (!createdProjectType || !createdProjectType.id) {
          throw new Error('Failed to create project type')
        }
        projectType = createdProjectType
        
        // Step 2: Create all project type details - API allows weightage, t_days, est_cost to be optional, so we don't send them
        for (let i = 0; i < combinedSteps.length; i++) {
          const step = combinedSteps[i]
          const submitData: { ptype_id: number; s_id: number; order: number } = {
            ptype_id: projectType.id,
            s_id: step.s_id,
            order: i + 1,
          }
          await createProjectTypeDetail(submitData)
        }
        
        // Step 3: Create prerequisite steps (PTS details) - need to fetch created details first
        await refetchDetails()
        const detailsResponse = await apiClient.getProjectTypeDetails({ ptype_id: projectType.id, all: true })
        const allDetails = detailsResponse.success && detailsResponse.data 
          ? (Array.isArray(detailsResponse.data) ? detailsResponse.data : (detailsResponse.data as any).details || [])
          : []
        
        // Create PTS details for prerequisites
        for (let i = 0; i < combinedSteps.length; i++) {
          const step = combinedSteps[i]
          // Find the created detail for this step (by s_id and order)
          const createdDetail = allDetails.find((d: any) => d.s_id === step.s_id && d.ptype_id === projectType.id)
          if (createdDetail && step.prerequisites.length > 0) {
            const ptdId = createdDetail.id || createdDetail.ptd_id
            if (!ptdId) continue
            
            for (const prerequisiteStepId of step.prerequisites) {
              // Find the prerequisite detail (must be created before this one)
              const prerequisiteDetail = allDetails.find((d: any) => d.s_id === prerequisiteStepId && d.ptype_id === projectType.id)
              if (prerequisiteDetail && ptdId) {
                await apiClient.createPTSDetail(ptdId, prerequisiteStepId)
              }
            }
          }
        }
      }
      
      // Refetch project types and details to update the UI
      await refetchProjectTypes()
      await refetchDetails()
      
      // Clear local ordered details and init refs so the list re-initializes from fresh data.
      // Otherwise we keep showing stale localOrderedDetails (same IDs, so effect doesn't overwrite).
      setLocalOrderedDetails([])
      initializedForProjectTypeRef.current = null
      lastInitializedDataRef.current = new Set()
      
      // Select the project type
      setSelectedProjectType(projectType)
      
      // Close dialog and reset
      handleCloseCombinedDialog()
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'An error occurred. The step may not have been updated.'
      console.error(`Failed to ${editingProjectTypeCombined ? 'update' : 'create'} project type with details:`, error)
      setCombinedSubmitError(getUserFriendlyApiErrorMessage(rawMessage))
    } finally {
      setIsCreatingCombined(false)
      setIsUpdatingCombined(false)
    }
  }

  const handleDelete = (projectType: ProjectType) => {
    setProjectTypeToDelete(projectType)
    setIsDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!projectTypeToDelete) return
    try {
      setIsDeleting(true)
      await deleteProjectType(projectTypeToDelete.id)
      
      // Clear selected project type if the deleted one was selected
      if (selectedProjectType?.id === projectTypeToDelete.id) {
        setSelectedProjectType(null)
      }
      
      setIsDeleteConfirmOpen(false)
      setProjectTypeToDelete(null)
    } catch (error) {
      console.error('Failed to delete project type:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Fetch PTS details for a project type detail
  const fetchPTSDetails = useCallback(async (ptd_id: number) => {
    try {
      const response = await apiClient.getPTSDetails(ptd_id)
      if (response.success && response.data) {
        return response.data
      }
      return []
    } catch (error) {
      console.error('Failed to fetch PTS details:', error)
      return []
    }
  }, [])

  // Fetch PTS details for all project type details
  useEffect(() => {
    const loadPTSDetails = async () => {
      if (selectedProjectTypeDetails.length > 0) {
        const newMap = new Map<number, PTSDetail[]>()
        for (const detail of selectedProjectTypeDetails) {
          const ptsDetails = await fetchPTSDetails(detail.id)
          newMap.set(detail.id, ptsDetails)
        }
        setPtsDetailsMap(newMap)
      }
    }
    loadPTSDetails()
  }, [selectedProjectTypeDetails, fetchPTSDetails])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id || !selectedProjectType) {
      return
    }

    // Use the current display list (localOrderedDetails if exists, otherwise selectedProjectTypeDetails)
    const currentList = localOrderedDetails.length > 0 ? localOrderedDetails : selectedProjectTypeDetails
    const oldIndex = currentList.findIndex((detail) => detail.id === active.id)
    const newIndex = currentList.findIndex((detail) => detail.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    // Show loading state to prevent flicker during re-render
    setIsSavingOrder(true)

    // Reorder the details locally (don't save yet)
    const reorderedDetails = arrayMove(currentList, oldIndex, newIndex)
    setLocalOrderedDetails(reorderedDetails)

    // Hide loading state after render completes
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsSavingOrder(false)
      })
    })
  }

  const handleSaveOrder = async () => {
    if (!selectedProjectType) return

    // Show loading state
    setIsSavingOrder(true)

    try {
      // Update order for all items
      const updates = localOrderedDetails.map((detail, index) => ({
        id: detail.id,
        order: index + 1,
      }))

      // Update all items with new order values
      for (const update of updates) {
        await updateProjectTypeDetail(update.id, { order: update.order })
      }

      // Refetch to get updated data
      await refetchDetails()
      
      // Reset flags so it reinitializes with fresh data
      initializedForProjectTypeRef.current = null
      lastInitializedDataRef.current = new Set()
    } catch (error) {
      console.error('Failed to save order:', error)
      // Hook already set detailsError; it will show in the Execution Steps card
    } finally {
      // Hide loading state
      setIsSavingOrder(false)
    }
  }

  const handleDiscardOrder = () => {
    // Reset to original order from selectedProjectTypeDetails
    const sortedDetails = [...selectedProjectTypeDetails].sort((a, b) => (a.order || 0) - (b.order || 0))
    setLocalOrderedDetails(sortedDetails)
    // Update original order map to match
    const orderMap = new Map<number, number>()
    sortedDetails.forEach((detail) => {
      orderMap.set(detail.id, detail.order || 0)
    })
    setOriginalOrder(orderMap)
  }

  const handleDeleteDetail = (detail: ProjectTypeDetail) => {
    setDetailToDelete(detail)
    setIsDeleteDetailConfirmOpen(true)
  }

  const handleConfirmDeleteDetail = async () => {
    if (!detailToDelete || !selectedProjectType) return
    try {
      setIsDeleting(true)
      
      // Get remaining details before deletion (exclude the one being deleted)
      const remainingDetails = selectedProjectTypeDetails
        .filter(d => d.id !== detailToDelete.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
      
      // Delete the detail
      await deleteProjectTypeDetail(detailToDelete.id)
      
      // Update order for all remaining details to be sequential (1, 2, 3, ...)
      if (remainingDetails.length > 0) {
        const updatePromises = remainingDetails.map((detail, index) => {
          const newOrder = index + 1
          // Only update if order has changed
          if (detail.order !== newOrder) {
            return updateProjectTypeDetail(detail.id, { order: newOrder })
          }
          return Promise.resolve()
        })
        
        // Wait for all order updates to complete
        await Promise.all(updatePromises)
      }
      
      // Refetch to get updated data
      await refetchDetails()
      
      // Reset local order state so it reinitializes with new data
      setLocalOrderedDetails([])
      setIsDeleteDetailConfirmOpen(false)
      setDetailToDelete(null)
    } catch (error) {
      console.error('Failed to delete project type detail:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="relative -mx-6 px-6" style={{ height: 'calc(100vh - 7rem)' }}>
      <div className="flex h-full gap-6 w-full min-w-[1000px]">
        {/* Left Sidebar - Project Types List */}
      <div className="w-70 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-800 h-full">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Types</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Manage project templates/workflows</p>
            </div>
            <Button onClick={() => handleOpenCombinedDialog()} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search project types..."
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
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading project types...</p>
            </div>
          ) : filteredProjectTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No project types found</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{hasActiveFilters ? 'Try adjusting your filters' : 'Get started by adding your first project type'}</p>
            </div>
          ) : (
            <div className="p-2">
              {filteredProjectTypes.map((projectType) => (
                <div
                  key={projectType.id}
                  onClick={() => setSelectedProjectType(projectType)}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-all mb-2 border",
                    selectedProjectType?.id === projectType.id
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-sm"
                      : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">{projectType.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ID: {projectType.id}
                        {projectType.department_name && (
                          <span className="ml-2">• {projectType.department_name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenCombinedDialog(projectType)} className="h-6 w-6 p-0">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(projectType)} className="h-6 w-6 p-0">
                        <Trash2 className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area - Master and Detail Tables */}
      <div className="flex-1 min-w-0 overflow-y-auto w-full">
        {selectedProjectType ? (
          <div className="space-y-6 w-full">
            {/* Master Info - Inline, non-table layout */}
            <div className="rounded-md border border-gray-200 dark:border-gray-800 bg-transparent shadow-none p-4 w-full">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Project Type</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedProjectType.name}</p>
                  {/* <p className="text-sm text-gray-600">Master information</p> */}
                </div>
                <Button onClick={() => handleOpenCombinedDialog(selectedProjectType)} size="sm" variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-500 dark:text-gray-400 w-42">ID</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedProjectType.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-500 dark:text-gray-400 w-42">Created</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatDate(selectedProjectType.created_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-500 dark:text-gray-400 w-42">Name</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedProjectType.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-500 dark:text-gray-400 w-42">Updated</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatDate(selectedProjectType.updated_at)}</span>
                </div>
                {selectedProjectType.department_name && (
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-500 dark:text-gray-400 w-42">Department</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedProjectType.department_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-500 dark:text-gray-400 w-42">Total Steps</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedProjectTypeDetails.length}</span>
                </div>
              </div>
            </div>

            {/* Detail Table - Project Type Details */}
            <Card className="w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Execution Steps</CardTitle>
                    <CardDescription>Manage steps and details for this project type</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasOrderChanged && (
                      <>
                        <Button onClick={handleDiscardOrder} size="sm" variant="outline" disabled={isSavingOrder}>
                          Discard
                        </Button>
                        <Button onClick={handleSaveOrder} size="sm" disabled={isSavingOrder}>
                          {isSavingOrder ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save Order'
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {detailsError && (
                  <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                    <p className="text-red-600 dark:text-red-400">{detailsError}</p>
                  </div>
                )}

                <div className="relative">
                  {isSavingOrder && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">Reordering steps...</p>
                      </div>
                    </div>
                  )}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Order</TableHead>
                          <TableHead className="min-w-[300px]">Step</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right hidden">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailsLoading ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                              <p className="text-sm text-gray-500 dark:text-gray-400">Loading execution steps...</p>
                            </TableCell>
                          </TableRow>
                        ) : selectedProjectTypeDetails.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-12">
                              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">No steps found</p>
                              <p className="text-gray-500 dark:text-gray-400">Get started by adding your first step</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          <SortableContext
                            items={localOrderedDetails.length > 0 ? localOrderedDetails.map((detail) => detail.id) : selectedProjectTypeDetails.map((detail) => detail.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {(localOrderedDetails.length > 0 ? localOrderedDetails : selectedProjectTypeDetails).map((detail, index) => (
                              <SortableDetailRow
                                key={detail.id}
                                detail={detail}
                                index={index}
                                getStepName={getStepName}
                                onEdit={(detail) => handleOpenCombinedDialog(selectedProjectType)}
                                onDelete={handleDeleteDetail}
                                prerequisiteSteps={ptsDetailsMap.get(detail.id) || []}
                                isExpanded={expandedRows.has(detail.id)}
                                onToggleExpand={() => {
                                  const newExpanded = new Set(expandedRows)
                                  if (newExpanded.has(detail.id)) {
                                    newExpanded.delete(detail.id)
                                  } else {
                                    newExpanded.add(detail.id)
                                  }
                                  setExpandedRows(newExpanded)
                                }}
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
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Layers className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Project Type Selected</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Select a project type from the list to view its details</p>
            <Button onClick={() => handleOpenCombinedDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Project Type
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
        fields={projectTypeFilterFields}
        getOperatorsForField={getProjectTypeOperatorsForField}
        getValueInput={getProjectTypeValueInput}
      />

      {/* Combined Creation Dialog - Create Project Type with Details */}
      <Dialog open={isCombinedDialogOpen} onOpenChange={(open) => {
        if (!open && isCreatingCombined) return
        setIsCombinedDialogOpen(open)
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle>{editingProjectTypeCombined ? 'Edit Project Type with Steps' : 'Create Project Type with Steps'}</DialogTitle>
            <DialogDescription>
              {editingProjectTypeCombined 
                ? 'Update project type and its execution steps.' 
                : 'Create a new project type and add its execution steps in one go.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Project Type Name */}
            <div className="space-y-2">
              <Label htmlFor="combined-name">Project Type Name <span className="text-red-500">*</span></Label>
              <Input 
                id="combined-name" 
                value={combinedFormData.name} 
                onChange={(e) => {
                  setCombinedFormData({ ...combinedFormData, name: e.target.value })
                  if (combinedErrors.name) {
                    setCombinedErrors({ ...combinedErrors, name: undefined })
                  }
                }}
                className={combinedErrors.name ? 'border-red-500' : ''}
                placeholder="Enter project type name..."
                required 
              />
              {combinedErrors.name && (
                <p className="text-sm text-red-500">{combinedErrors.name}</p>
              )}
            </div>

            {combinedSubmitError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">{combinedSubmitError}</p>
              </div>
            )}

            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="combined-department">Department <span className="text-red-500">*</span></Label>
              <Select
                value={combinedFormData.department_id > 0 ? combinedFormData.department_id.toString() : undefined}
                onValueChange={(value) => {
                  setCombinedFormData({ ...combinedFormData, department_id: Number(value) })
                  if (combinedErrors.department_id) {
                    const newErrors = { ...combinedErrors }
                    delete newErrors.department_id
                    setCombinedErrors(newErrors)
                  }
                }}
                disabled={editingProjectTypeCombined !== null || departmentsLoading}
              >
                <SelectTrigger className={combinedErrors.department_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder={departmentsLoading ? "Loading..." : "Select department"} />
                </SelectTrigger>
                <SelectContent>
                  {departmentsLoading ? (
                    <div className="p-2 text-sm text-gray-500">Loading departments...</div>
                  ) : departments.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No departments available</div>
                  ) : (
                    departments.map((dept) => (
                      <SelectItem key={dept.dept_id} value={dept.dept_id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {combinedErrors.department_id && (
                <p className="text-sm text-red-500">{combinedErrors.department_id}</p>
              )}
              {editingProjectTypeCombined && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Department cannot be changed
                </p>
              )}
            </div>

            {/* Steps Section */}
            <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Execution Steps <span className="text-red-500">*</span></Label>
              </div>

              {combinedErrors.steps?._general && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-600 dark:text-red-400">{combinedErrors.steps._general.s_id}</p>
                </div>
              )}

              <div className="relative">
                {isReorderingSteps && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">Reordering steps...</p>
                    </div>
                  </div>
                )}
                {combinedSteps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic mb-4">
                      No steps added. Click "Add Step" to add execution steps.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddCombinedStep}
                      disabled={isReorderingSteps}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Step
                    </Button>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleCombinedDragEnd}
                  >
                    <SortableContext
                      items={combinedSteps.map(s => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-4">
                        {combinedSteps.map((step, index) => {
                          return <SortableCombinedStep
                            key={step.id}
                            step={step}
                            index={index}
                            stepErrors={combinedErrors.steps?.[step.id] || {}}
                            combinedSteps={combinedSteps}
                            steps={steps}
                            getStepName={getStepName}
                            onStepChange={handleCombinedStepChange}
                            onPrerequisiteChange={handleCombinedPrerequisiteChange}
                            onRemove={handleRemoveCombinedStep}
                          />
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              {/* Add Step Button - shown below last step when steps exist */}
              {combinedSteps.length > 0 && (
                <div className="flex justify-center pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCombinedStep}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Step
                  </Button>
                </div>
              )}

            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseCombinedDialog} disabled={isCreatingCombined || isUpdatingCombined}>Cancel</Button>
            <Button onClick={handleSubmitCombined} disabled={isCreatingCombined || isUpdatingCombined}>
              {isCreatingCombined || isUpdatingCombined ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingProjectTypeCombined ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingProjectTypeCombined ? 'Update Project Type' : 'Create Project Type'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Type Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={(open) => {
        if (!open && isDeleting) return
        setIsDeleteConfirmOpen(open)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{projectTypeToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDeleteConfirmOpen(false)
              setProjectTypeToDelete(null)
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
                'Delete Project Type'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Type Detail Confirmation Dialog */}
      <Dialog open={isDeleteDetailConfirmOpen} onOpenChange={(open) => {
        if (!open && isDeleting) return
        setIsDeleteDetailConfirmOpen(open)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project Type Detail</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the step <strong>{detailToDelete ? getStepName(detailToDelete.s_id) : 'this step'}</strong> from this project type? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDeleteDetailConfirmOpen(false)
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
                'Delete Detail'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}

