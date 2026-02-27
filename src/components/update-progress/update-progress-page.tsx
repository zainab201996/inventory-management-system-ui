'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useBusinessPlans } from '@/hooks/use-business-plans'
import { useProjectTypes } from '@/hooks/use-project-types'
import { useBusinessPlanDetails } from '@/hooks/use-business-plan-details'
import { useDelayReasons } from '@/hooks/use-delay-reasons'
import { useBPDDelays } from '@/hooks/use-bpd-delays'
import { useBPDMaterials } from '@/hooks/use-bpd-materials'
import { useMaterials } from '@/hooks/use-materials'
import { formatDate, CURRENCY_SYMBOL, cn, formatDateForInput } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import { BusinessPlan, BusinessPlanDetail, BPDDelay, PTSDetail, BPDMaterial } from '@/types'
import { Search, Loader2, Filter, X, Play, CheckCircle, Plus, Trash2, AlertCircle, Clock, DollarSign, FileText, ArrowDown, ChevronDown, ChevronUp, TrendingUp, TrendingDown, ChevronRight, Check, XCircle, Package, Edit, Building2, Calendar, Hash, FolderOpen, ListChecks, Wallet, Target } from 'lucide-react'
import { AdvancedFilterDialog, FilterField, FilterOperator } from '@/components/ui/advanced-filter-dialog'
import { useUserAccess, getSlugForName } from '@/hooks/use-user-access'
import { useToast } from '@/components/ui/use-toast'

const businessPlanFilterFields: FilterField[] = [
  { value: 'name', label: 'Project Name', type: 'text' },
  { value: 'project_type', label: 'Project Type', type: 'text' },
  { value: 'department', label: 'Department', type: 'text' },
  { value: 'start_date', label: 'Start Date', type: 'date' },
  { value: 'completion_date', label: 'Completion Date', type: 'date' },
  { value: 'created_at', label: 'Created Date', type: 'date' }
]

const getBusinessPlanOperatorsForField = (field: string): FilterOperator[] => {
  switch (field) {
    case 'start_date':
    case 'completion_date':
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

export function UpdateProgressPage() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterModel, setFilterModel] = useState({
    items: [] as Array<{ id: number; field: string; operator: string; value: any }>,
    logicOperator: 'and' as 'and' | 'or'
  })
  const [selectedBusinessPlan, setSelectedBusinessPlan] = useState<BusinessPlan | null>(null)
  const [remarksDialogOpen, setRemarksDialogOpen] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState<BusinessPlanDetail | null>(null)
  const [actionType, setActionType] = useState<'start' | 'complete' | 'edit'>('start')
  const [remarks, setRemarks] = useState('')
  const [actCost, setActCost] = useState<string>('')
  const [startedAt, setStartedAt] = useState<string>('')
  const [completedAt, setCompletedAt] = useState<string>('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [delayEntries, setDelayEntries] = useState<Array<{ delay_id: number | ''; remarks: string }>>([])
  const [materialEntries, setMaterialEntries] = useState<Array<{ m_id: number | ''; r_qty: string; req_remarks: string }>>([])
  const [materialActQtys, setMaterialActQtys] = useState<Record<number, string>>({})
  const [materialActRemarks, setMaterialActRemarks] = useState<Record<number, string>>({})
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())
  
  // Fetch existing materials for the selected detail (for complete dialog and edit mode)
  // Fetch when we have a selected detail and it's for completing or editing (step is started or completed)
  // Note: When starting a step, materials are created but we don't need to fetch them in the dialog
  // because they're new. However, we do need to fetch them after starting to update the display.
  const shouldFetchMaterials = Boolean(
    selectedDetail && 
    (actionType === 'complete' || actionType === 'edit') && 
    (selectedDetail.status === 1 || selectedDetail.status === 2)
  )
  const { bpdMaterials: existingMaterials, refetch: refetchMaterials, createBPDMaterial, updateBPDMaterial, deleteBPDMaterial } = useBPDMaterials({ 
    bpd_id: shouldFetchMaterials && selectedDetail ? selectedDetail.bpd_id : undefined, 
    all: shouldFetchMaterials ? true : undefined
  })

  // Initialize materialActQtys, materialActRemarks, and materialEntries when existing materials load (for edit mode)
  useEffect(() => {
    // Only process materials if we should be fetching them and they belong to the selected detail
    if (!shouldFetchMaterials || !selectedDetail) {
      // Clear materialEntries if we shouldn't be fetching materials
      if (actionType === 'edit' && selectedDetail?.status === 1) {
        setMaterialEntries([])
      }
      return
    }

    // Filter materials to ensure they belong to the current selectedDetail
    const validMaterials = existingMaterials.filter(m => m.bpd_id === selectedDetail.bpd_id)

    if ((actionType === 'complete' || actionType === 'edit') && validMaterials.length > 0) {
      const initialQtys: Record<number, string> = {}
      const initialRemarks: Record<number, string> = {}
      validMaterials.forEach(material => {
        if (material.act_qty != null) {
          // Convert to integer string (remove decimals if any)
          initialQtys[material.bpdm_id] = Math.floor(material.act_qty).toString()
        }
        if (material.act_remarks != null) {
          initialRemarks[material.bpdm_id] = material.act_remarks
        }
      })
      setMaterialActQtys(prev => ({ ...prev, ...initialQtys }))
      setMaterialActRemarks(prev => ({ ...prev, ...initialRemarks }))
      
      // For edit mode, also populate materialEntries with existing materials
      if (actionType === 'edit' && selectedDetail.status === 1) {
        const entries = validMaterials.map(material => ({
          m_id: material.m_id,
          r_qty: material.r_qty.toString(),
          req_remarks: material.req_remarks || ''
        }))
        setMaterialEntries(entries)
      }
    } else if (actionType === 'edit' && selectedDetail.status === 1 && validMaterials.length === 0) {
      // Clear materialEntries if there are no valid materials for this step
      setMaterialEntries([])
    }
  }, [existingMaterials, actionType, selectedDetail, shouldFetchMaterials])

  const { access } = useUserAccess()
  // Use Business Plans page for main view permission (Update Progress page doesn't exist in DB)
  const hasShowPermission = (access?.aggregatedPermissions?.[getSlugForName('Update Progress Start')]?.show === true) || (access?.aggregatedPermissions?.[getSlugForName('Update Progress Complete')]?.show === true)
  // Check permissions for action endpoints (these are the actual pages in the database)
  const hasStartStepPermission = access?.aggregatedPermissions?.[getSlugForName('Update Progress Start')]?.edit === true
  const hasCompleteStepPermission = access?.aggregatedPermissions?.[getSlugForName('Update Progress Complete')]?.edit === true
  // For UI visibility, check if user has either start or complete permission
  const hasEditPermission = hasStartStepPermission || hasCompleteStepPermission

  // Only fetch started projects (status = 1), not planned (0) or completed (2)
  const { businessPlans, loading, error, updateBusinessPlan, completeBusinessPlan, refetch: refetchBusinessPlans } = useBusinessPlans({ all: true, status: 1 })
  const { projectTypes } = useProjectTypes({ all: true })
  const { delayReasons } = useDelayReasons({ all: true })
  const { materials } = useMaterials({ all: true })
  
  // Fetch business plan details for selected business plan with server-side sorting
  const { businessPlanDetails, loading: businessPlanDetailsLoading, error: businessPlanDetailsError, refetch: refetchDetails, updateBusinessPlanDetail, startBusinessPlanDetail, completeBusinessPlanDetail } = useBusinessPlanDetails({ 
    proj_id: selectedBusinessPlan?.id, 
    all: true,
    sort_by: 'order',
    sort_order: 'asc'
  })

  // Fetch all delays for the selected business plan details
  // We'll fetch delays for all details of the selected business plan
  const allBpdIds = useMemo(() => businessPlanDetails.map(d => d.bpd_id), [businessPlanDetails])
  
  // Fetch delays for all details (we'll group them by bpd_id)
  const { bpdDelays: allBPDDelays, loading: delaysLoading, createBPDDelay, refetch: refetchDelays } = useBPDDelays({ 
    all: true 
  })
  
  // Group delays by bpd_id for easy lookup
  const delaysByBpdId = useMemo(() => {
    const grouped: Record<number, BPDDelay[]> = {}
    allBPDDelays
      .filter(delay => allBpdIds.includes(delay.bpd_id))
      .forEach(delay => {
        if (!grouped[delay.bpd_id]) {
          grouped[delay.bpd_id] = []
        }
        grouped[delay.bpd_id].push(delay)
      })
    return grouped
  }, [allBPDDelays, allBpdIds])

  // Fetch materials for all details (we'll group them by bpd_id)
  // Note: API requires bpd_id when using all=true, so we fetch without all=true and filter client-side
  // We use a high limit to get all materials, or fetch without pagination if possible
  const { bpdMaterials: allBPDMaterials, loading: materialsLoading, refetch: refetchAllMaterials } = useBPDMaterials({ 
    limit: 1000 // Use high limit to get all materials
  })
  
  // Group materials by bpd_id for easy lookup
  const materialsByBpdId = useMemo(() => {
    const grouped: Record<number, BPDMaterial[]> = {}
    if (allBpdIds.length === 0) return grouped
    
    allBPDMaterials
      .filter(material => allBpdIds.includes(material.bpd_id))
      .forEach(material => {
        if (!grouped[material.bpd_id]) {
          grouped[material.bpd_id] = []
        }
        grouped[material.bpd_id].push(material)
      })
    return grouped
  }, [allBPDMaterials, allBpdIds])

  // PTS prerequisites for Business Plan detail section (read-only view)
  const [bpDetailPtsByBpdId, setBpDetailPtsByBpdId] = useState<Map<number, PTSDetail[]>>(new Map())
  const [expandedPrerequisites, setExpandedPrerequisites] = useState<Set<number>>(new Set())

  // Fetch PTS details for prerequisites
  const fetchPTSDetails = useCallback(async (ptdId: number, projId?: number): Promise<PTSDetail[]> => {
    try {
      const response = await apiClient.getPTSDetails(ptdId, projId)
      if (response.success && response.data) {
        return response.data
      }
      return []
    } catch {
      return []
    }
  }, [])

  // Load prerequisite (PTS) data for Business Plan detail section
  useEffect(() => {
    const loadBusinessPlanDetailPTS = async () => {
      if (!selectedBusinessPlan || businessPlanDetails.length === 0) {
        setBpDetailPtsByBpdId(new Map())
        setExpandedPrerequisites(new Set())
        return
      }

      try {
        const ptdResp = await apiClient.getProjectTypeDetails({ ptype_id: selectedBusinessPlan.ptype_id, all: true })
        const ptdList = ptdResp.success && ptdResp.data
          ? (Array.isArray(ptdResp.data) ? ptdResp.data : (ptdResp.data as any).details || [])
          : []

        const ptdByStepId = new Map<number, any>(ptdList.map((d: any) => [d.s_id, d]))

        const entries: Array<readonly [number, PTSDetail[]]> = await Promise.all(
          businessPlanDetails.map(async (bpd) => {
            const ptd = ptdByStepId.get(bpd.s_id)
            if (!ptd?.id) return [bpd.bpd_id, [] as PTSDetail[]] as const
            // Pass proj_id to let API filter out skipped prerequisites
            const pts = await fetchPTSDetails(ptd.id, selectedBusinessPlan.id)
            return [bpd.bpd_id, pts] as const
          })
        )

        setBpDetailPtsByBpdId(new Map(entries))
      } catch {
        setBpDetailPtsByBpdId(new Map())
      }
    }

    loadBusinessPlanDetailPTS()
  }, [selectedBusinessPlan, businessPlanDetails, fetchPTSDetails])

  // Helper function to get step name
  const getStepName = useCallback((stepId: number): string => {
    // Find step name from business plan details
    const detail = businessPlanDetails.find(d => d.s_id === stepId)
    return detail?.step?.name || 'N/A'
  }, [businessPlanDetails])

  // Helper functions to get names
  const getProjectTypeName = (ptypeId: number) => {
    const projectType = projectTypes.find(pt => pt.id === ptypeId)
    return projectType?.name || 'N/A'
  }

  const getDepartmentName = (businessPlan: BusinessPlan) => {
    return businessPlan.department_name || businessPlan.department?.name || 'N/A'
  }

  const getFundingSourceName = (businessPlan: BusinessPlan) => {
    if (!businessPlan.fs_id) return 'N/A'
    return businessPlan.funding_source_name || 'N/A'
  }

  const getStatusDisplay = (status: number) => {
    switch (status) {
      case 0: return 'Planned'
      case 1: return 'Started'
      case 2: return 'Completed'
      case 3: return 'Cancelled'
      default: return 'Unknown'
    }
  }

  const getStatusBadgeColor = (status: number) => {
    switch (status) {
      case 0: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
      case 1: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 2: return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 3: return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  // Check if a step can be started (all prerequisite steps must be completed)
  const canStartStep = useCallback((detail: BusinessPlanDetail) => {
    // If step is already started or completed, it can't be started again
    if (detail.status !== 0) {
      return false
    }

    // Get prerequisites for this step
    const prerequisites = bpDetailPtsByBpdId.get(detail.bpd_id) || []
    
    // If no prerequisites, step can be started
    if (prerequisites.length === 0) {
      return true
    }

    // Get prerequisite step IDs
    const prerequisiteStepIds = prerequisites.map(pts => pts.step_id)
    
    // Find all business plan details that match prerequisite step IDs
    const prerequisiteDetails = businessPlanDetails.filter(bpd => 
      prerequisiteStepIds.includes(bpd.s_id)
    )

    // If we can't find all prerequisite details, we can't verify - allow starting to avoid blocking
    if (prerequisiteDetails.length !== prerequisiteStepIds.length) {
      return true // Allow starting if we can't verify prerequisites
    }

    // All prerequisite steps must be completed (status === 2)
    const allPrerequisitesCompleted = prerequisiteDetails.every(bpd => bpd.status === 2)
    
    return allPrerequisitesCompleted
  }, [businessPlanDetails, bpDetailPtsByBpdId])

  // Check if a step can be completed (all materials must be allocated - status = 1)
  const canCompleteStep = useCallback((detail: BusinessPlanDetail) => {
    // If step is not started (status !== 1), it can't be completed
    if (detail.status !== 1) {
      return false
    }

    // Get materials for this step
    const materials = materialsByBpdId[detail.bpd_id] || []
    
    // If there are no materials, step can be completed (no material requirement)
    if (materials.length === 0) {
      return true
    }

    // All materials must have status = 1 (allocated)
    const allMaterialsAllocated = materials.every(material => material.status === 1)
    
    return allMaterialsAllocated
  }, [materialsByBpdId])

  const getBusinessPlanFieldValue = (businessPlan: BusinessPlan, field: string) => {
    switch (field) {
      case 'name': return businessPlan.name || ''
      case 'project_type': return getProjectTypeName(businessPlan.ptype_id)
      case 'department': return getDepartmentName(businessPlan)
      case 'start_date': return businessPlan.start_date || ''
      case 'completion_date': return businessPlan.completion_date || ''
      case 'created_at': return businessPlan.created_at
      default: return ''
    }
  }

  const applyBusinessPlanFilterCondition = (fieldValue: any, operator: string, filterValue: any) => {
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

  const filteredBusinessPlans = useMemo(() => {
    let filtered = businessPlans
    if (searchTerm) {
      filtered = filtered.filter(businessPlan =>
        businessPlan.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getProjectTypeName(businessPlan.ptype_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getDepartmentName(businessPlan).toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (filterModel.items.length > 0) {
      filtered = filtered.filter(businessPlan => {
        const results = filterModel.items.map(item => {
          const fieldValue = getBusinessPlanFieldValue(businessPlan, item.field)
          return applyBusinessPlanFilterCondition(fieldValue, item.operator, item.value)
        })
        return filterModel.logicOperator === 'and' ? results.every(r => r) : results.some(r => r)
      })
    }
    return filtered
  }, [businessPlans, searchTerm, filterModel])

  const hasActiveFilters = filterModel.items.length > 0 || searchTerm

  const getBusinessPlanValueInput = (field: FilterField, operator: string, value: any, onChange: (value: any) => void) => {
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

  // Check if estimated time is past current date/time
  // Uses project start_date (from master table) + t_days
  const isEstTimePast = useCallback((detail: BusinessPlanDetail): boolean => {
    if (!selectedBusinessPlan?.start_date || !detail.t_days) {
      return false
    }

    const projectStartDate = new Date(selectedBusinessPlan.start_date)
    const estimatedCompletionDate = new Date(projectStartDate)
    estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + detail.t_days)
    
    const now = new Date()
    return now > estimatedCompletionDate
  }, [selectedBusinessPlan])

  // Determine if step is on-time or delayed
  const getStepResult = useCallback((detail: BusinessPlanDetail): { status: 'on-time' | 'delayed' | 'pending' | 'na', label: string } => {
    // Use due_date from API (calculated by backend with prerequisite logic)
    if (!detail.due_date) {
      return { status: 'na', label: 'N/A' }
    }

    const dueDateObj = new Date(detail.due_date)
    const now = new Date()

    // If step is completed
    if (detail.completed_at) {
      const completedDate = new Date(detail.completed_at)
      // Compare dates (ignore time)
      const completedDateOnly = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate())
      const dueDateOnly = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), dueDateObj.getDate())
      
      if (completedDateOnly <= dueDateOnly) {
        return { status: 'on-time', label: 'On-time' }
      } else {
        return { status: 'delayed', label: 'Delayed' }
      }
    }

    // If step is not completed
    // Compare current date with due date (ignore time)
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const dueDateOnly = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), dueDateObj.getDate())
    
    if (nowDateOnly > dueDateOnly) {
      return { status: 'delayed', label: 'Delayed' }
    }

    return { status: 'pending', label: 'Pending' }
  }, [])

  // Find current and next steps
  const { currentSteps, nextStep } = useMemo(() => {
    if (businessPlanDetails.length === 0) {
      return { currentSteps: [], nextStep: null }
    }

    // Find all steps that are started (status = 1) but not completed (status != 2)
    // Sort by order to maintain sequence
    const activeSteps = businessPlanDetails
      .filter(d => d.status === 1)
      .sort((a, b) => (a.order || 0) - (b.order || 0))

    if (activeSteps.length === 0) {
      // If no step is started, find the first planned step as "next step"
      const firstPlannedStep = businessPlanDetails
        .filter(d => d.status === 0)
        .sort((a, b) => (a.order || 0) - (b.order || 0))[0]
      
      return { currentSteps: [], nextStep: firstPlannedStep || null }
    }

    // Find next step (the step with order greater than the highest current step's order)
    const maxCurrentOrder = Math.max(...activeSteps.map(s => s.order || 0))
    const next = businessPlanDetails
      .filter(d => (d.order || 0) > maxCurrentOrder)
      .sort((a, b) => (a.order || 0) - (b.order || 0))[0] || null

    return { currentSteps: activeSteps, nextStep: next }
  }, [businessPlanDetails])
  
  // Keep currentStep for backward compatibility with status section
  const currentStep = currentSteps.length > 0 ? currentSteps[0] : null

  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    if (businessPlanDetails.length === 0) return 0
    const completedSteps = businessPlanDetails.filter(d => d.status === 2).length
    return Math.round((completedSteps / businessPlanDetails.length) * 100)
  }, [businessPlanDetails])

  const handleStartOrComplete = (detail: BusinessPlanDetail) => {
    // Check specific permissions for starting or completing steps
    if (detail.status === 0 && !hasStartStepPermission) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'You do not have permission to start steps',
      })
      return
    }
    if (detail.status === 1 && !hasCompleteStepPermission) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'You do not have permission to complete steps',
      })
      return
    }

    setSelectedDetail(detail)
    setSubmitError(null) // Clear any previous error when opening dialog
    if (detail.status === 0) {
      setActionType('start')
      setRemarks('')
      setActCost('')
      // Initialize start date to today (YYYY-MM-DD format)
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      setStartedAt(todayStr)
      setCompletedAt('')
      setDelayEntries([])
      setMaterialEntries([])
    } else if (detail.status === 1) {
      setActionType('complete')
      setRemarks('')
      setActCost('')
      // Initialize completion date to today (YYYY-MM-DD format)
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      setCompletedAt(todayStr)
      setStartedAt('')
      // Initialize delay entries if est time is past
      if (isEstTimePast(detail)) {
        setDelayEntries([{ delay_id: '', remarks: '' }])
      } else {
        setDelayEntries([])
      }
      // Materials will be loaded from existingMaterials via the hook
      setMaterialActQtys({})
      setMaterialActRemarks({})
    }
    setRemarksDialogOpen(true)
  }

  const handleAddMaterialEntry = () => {
    setMaterialEntries([...materialEntries, { m_id: '', r_qty: '', req_remarks: '' }])
  }

  const handleRemoveMaterialEntry = (index: number) => {
    setMaterialEntries(materialEntries.filter((_, i) => i !== index))
  }

  const handleMaterialEntryChange = (index: number, field: 'm_id' | 'r_qty' | 'req_remarks', value: string | number) => {
    const updated = [...materialEntries]
    
    // For r_qty, ensure it's an integer (no decimals)
    if (field === 'r_qty' && typeof value === 'string') {
      // Remove any decimal points and non-numeric characters except digits
      const numericValue = value.replace(/[^\d]/g, '')
      updated[index] = { ...updated[index], [field]: numericValue }
    } else {
      updated[index] = { ...updated[index], [field]: value }
    }
    
    setMaterialEntries(updated)
  }

  const handleEdit = (detail: BusinessPlanDetail) => {
    setSelectedDetail(detail)
    setSubmitError(null) // Clear any previous error when opening dialog
    setActionType('edit')
    
    // Load existing remarks based on status
    if (detail.status === 1) {
      // Started step - load remarks_1
      setRemarks(detail.remarks_1 || '')
    } else if (detail.status === 2) {
      // Completed step - load remarks_2
      setRemarks(detail.remarks_2 || '')
    }
    
    setActCost(detail.act_cost?.toString() || '')
    // For edit mode, dates are not editable (they were set when starting/completing)
    setStartedAt('')
    setCompletedAt('')
    setDelayEntries([]) // Delays are read-only in edit mode
    setMaterialEntries([]) // Will be loaded from existingMaterials
    setMaterialActQtys({})
    setMaterialActRemarks({})
    setRemarksDialogOpen(true)
  }


  const handleAddDelayEntry = () => {
    setDelayEntries([...delayEntries, { delay_id: '', remarks: '' }])
  }

  const handleRemoveDelayEntry = (index: number) => {
    setDelayEntries(delayEntries.filter((_, i) => i !== index))
  }

  const handleDelayEntryChange = (index: number, field: 'delay_id' | 'remarks', value: number | string) => {
    const updated = [...delayEntries]
    updated[index] = { ...updated[index], [field]: value }
    setDelayEntries(updated)
  }

  const handleSubmitRemarks = async () => {
    if (!selectedDetail || !selectedBusinessPlan) return
    // Clear any previous submission error when retrying
    setSubmitError(null)

    // Validate date fields for start and complete actions
    if (actionType === 'start') {
      if (!startedAt || !startedAt.trim()) {
        toast({
          variant: 'destructive',
          title: 'Start Date Required',
          description: 'Please provide the start date for this step.',
        })
        return
      }
    } else if (actionType === 'complete') {
      if (!completedAt || !completedAt.trim()) {
        toast({
          variant: 'destructive',
          title: 'Completion Date Required',
          description: 'Please provide the completion date for this step.',
        })
        return
      }
    }

    // Materials are optional when starting a step - validation commented out
    // Validate material entries when starting a step
    // if (actionType === 'start') {
    //   // Check if any material entries are incomplete
    //   const incompleteEntries = materialEntries.filter(entry => {
    //     const hasMaterial = entry.m_id !== ''
    //     const hasQty = entry.r_qty !== '' && parseInt(entry.r_qty) > 0
    //     return hasMaterial && !hasQty // Has material but no valid quantity
    //   })
    //   
    //   if (incompleteEntries.length > 0) {
    //     toast({
    //       variant: 'destructive',
    //       title: 'Missing Required Quantity',
    //       description: 'Please provide a required quantity (integer) for all selected materials.',
    //     })
    //     return
    //   }
    //   
    //   // Check if any entries have invalid quantity (decimal or zero)
    //   const invalidQtyEntries = materialEntries.filter(entry => {
    //     if (entry.m_id === '') return false // Skip empty entries
    //     const qty = entry.r_qty
    //     if (!qty || qty.trim() === '') return true // Missing quantity
    //     const numQty = parseInt(qty)
    //     if (isNaN(numQty) || numQty <= 0) return true // Invalid or zero
    //     if (parseFloat(qty) !== numQty) return true // Has decimals
    //     return false
    //   })
    //   
    //   if (invalidQtyEntries.length > 0) {
    //     toast({
    //       variant: 'destructive',
    //       title: 'Invalid Quantity',
    //       description: 'Required quantity must be a positive integer (whole number). Decimals are not allowed.',
    //     })
    //     return
    //   }
    // }

    // Validate that all materials are allocated before completing
    if (actionType === 'complete') {
      if (!canCompleteStep(selectedDetail)) {
        const materials = materialsByBpdId[selectedDetail.bpd_id] || []
        const unallocatedMaterials = materials.filter(m => m.status !== 1)
        if (unallocatedMaterials.length > 0) {
          const materialNames = unallocatedMaterials
            .map(m => m.material?.name || 'Unknown Material')
            .join(', ')
          toast({
            variant: 'destructive',
            title: 'Cannot Complete Step',
            description: `All materials must be allocated before completing. The following materials are not allocated: ${materialNames}`,
          })
          return
        }
      }

      // Validate that actual quantity is provided for all materials
      if (existingMaterials.length > 0) {
        const materialsWithoutActQty: string[] = []
        const materialsWithInvalidQty: string[] = []
        
        for (const material of existingMaterials) {
          const actQty = materialActQtys[material.bpdm_id]
          if (!actQty || actQty.trim() === '') {
            materialsWithoutActQty.push(material.material?.name || 'Unknown Material')
          } else {
            // Validate that it's a valid positive integer (no decimals)
            const qty = parseInt(actQty)
            if (isNaN(qty) || qty < 0 || parseFloat(actQty) !== qty) {
              materialsWithInvalidQty.push(material.material?.name || 'Unknown Material')
            }
          }
        }
        
        if (materialsWithoutActQty.length > 0) {
          toast({
            variant: 'destructive',
            title: 'Missing Information',
            description: `Please provide actual quantity used for all materials. Missing quantities for: ${materialsWithoutActQty.join(', ')}`,
          })
          return
        }
        
        if (materialsWithInvalidQty.length > 0) {
          toast({
            variant: 'destructive',
            title: 'Invalid Quantity',
            description: `Actual quantity must be a positive integer (whole number) for: ${materialsWithInvalidQty.join(', ')}`,
          })
          return
        }
      }
    }

    // Validate delay entries if est time is past and completing
    if (actionType === 'complete' && isEstTimePast(selectedDetail)) {
      const validEntries = delayEntries.filter(entry => entry.delay_id !== '')
      if (validEntries.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Delay Reason Required',
          description: 'Please add at least one delay reason since the estimated completion time has passed.',
        })
        return
      }
      // Validate all entries have delay_id
      for (const entry of delayEntries) {
        if (entry.delay_id === '') {
          toast({
            variant: 'destructive',
            title: 'Invalid Delay Entry',
            description: 'Please select a delay reason for all delay entries.',
          })
          return
        }
      }
    }

    try {
      setIsUpdating(true)
      
      // Use the new action endpoints for starting/completing steps
      // These endpoints handle status, remarks, and dates automatically
      let updateResult: BusinessPlanDetail | null = null
      
      if (actionType === 'start') {
        // Use start action endpoint which sets status to 1, started_at to provided date, and allows remarks_1
        // Hook now throws on error with exact server message
        updateResult = await startBusinessPlanDetail(selectedDetail.bpd_id, startedAt, remarks || null)
      } else if (actionType === 'complete') {
        // Use complete action endpoint which sets status to 2, completed_at to provided date, remarks_2, and act_cost
        // Hook now throws on error with exact server message
        const actCostValue = actCost && actCost.trim() !== '' ? parseInt(actCost) : undefined
        updateResult = await completeBusinessPlanDetail(
          selectedDetail.bpd_id, 
          completedAt, 
          remarks || null,
          actCostValue
        )
      }
      // For edit mode, we don't call start/complete endpoints - we just update the details below

      // Create delay entries if completing and est time is past
      if (actionType === 'complete' && isEstTimePast(selectedDetail)) {
        const validEntries = delayEntries.filter(entry => entry.delay_id !== '')
        for (const entry of validEntries) {
          await createBPDDelay({
            bpd_id: selectedDetail.bpd_id,
            delay_id: entry.delay_id as number,
            remarks: entry.remarks || null
          })
        }
        // Refetch delays to update the display
        await refetchDelays()
      }

      // Materials are optional when starting a step - commented out
      // Create material entries if starting
      // if (actionType === 'start') {
      //   const validMaterialEntries = materialEntries.filter(entry => entry.m_id !== '' && entry.r_qty !== '' && parseInt(entry.r_qty) > 0)
      //   for (const entry of validMaterialEntries) {
      //     await createBPDMaterial({
      //       bpd_id: selectedDetail.bpd_id,
      //       m_id: entry.m_id as number,
      //       r_qty: entry.r_qty ? parseInt(entry.r_qty) : 0,
      //       req_remarks: entry.req_remarks || null,
      //       status: 0 // Required status
      //     })
      //   }
      //   // After creating materials, refetch all materials to update the display
      //   // Note: refetchMaterials() may not work here if the hook isn't configured for this bpd_id yet,
      //   // but refetchAllMaterials() will update materialsByBpdId which is used throughout the component
      //   await refetchAllMaterials() // Refresh all materials so step cards show the new materials
      // }

      // Filter materials to ensure they belong to the current selectedDetail
      const validMaterials = selectedDetail ? existingMaterials.filter(m => m.bpd_id === selectedDetail.bpd_id) : []

      // Update material act_qty, act_remarks and status if completing
      if (actionType === 'complete') {
        for (const [bpdmId, actQty] of Object.entries(materialActQtys)) {
          if (actQty && actQty.trim() !== '') {
            // Use the use action endpoint which sets status to 2 (installed) and handles act_qty and act_remarks
            const material = validMaterials.find(m => m.bpdm_id === parseInt(bpdmId))
            if (material) {
              const actRemarks = materialActRemarks[parseInt(bpdmId)] || null
              await apiClient.useBPDMaterial(
                parseInt(bpdmId),
                parseInt(actQty),
                actRemarks && actRemarks.trim() !== '' ? actRemarks : null
              )
            }
          }
        }
        await refetchMaterials()
        await refetchAllMaterials()
      }

      // Handle edit mode
      if (actionType === 'edit') {
        // Build update payload to combine all updates into a single API call
        const updatePayload: {
          act_cost?: number | null;
          remarks_1?: string | null;
          remarks_2?: string | null;
        } = {}

        // Add act_cost to payload if provided or needs to be cleared
        if (actCost && actCost.trim() !== '') {
          updatePayload.act_cost = parseInt(actCost)
        } else if (actCost === '') {
          updatePayload.act_cost = null
        }

        // Add remarks to payload - API now allows updating remarks_1 when status is 1, and remarks_2 when status is 2
        if (selectedDetail.status === 1 && remarks !== selectedDetail.remarks_1) {
          updatePayload.remarks_1 = remarks || null
        } else if (selectedDetail.status === 2 && remarks !== selectedDetail.remarks_2) {
          updatePayload.remarks_2 = remarks || null
        }

        // Only call update if there's something to update
        if (Object.keys(updatePayload).length > 0) {
          await updateBusinessPlanDetail(selectedDetail.bpd_id, updatePayload)
        }

        // Update materials for started steps (status === 1)
        if (selectedDetail.status === 1) {
          // Get existing material IDs (only from valid materials)
          const existingMaterialIds = new Set(validMaterials.map(m => m.bpdm_id))
          const newMaterialIds = new Set(materialEntries.filter(e => e.m_id !== '').map(e => e.m_id as number))

          // Delete materials that are no longer in the list (only if not allocated)
          for (const existingMaterial of validMaterials) {
            if (!newMaterialIds.has(existingMaterial.m_id) && existingMaterial.status !== 1) {
              await deleteBPDMaterial(existingMaterial.bpdm_id)
            }
          }

          // Update or create materials
          for (const entry of materialEntries) {
            if (entry.m_id === '') continue

            const existingMaterial = validMaterials.find(m => m.m_id === entry.m_id as number)
            if (existingMaterial) {
              // Only update if material is not allocated (status !== 1)
              if (existingMaterial.status !== 1) {
                await updateBPDMaterial(existingMaterial.bpdm_id, {
                  r_qty: entry.r_qty ? parseInt(entry.r_qty) : 0,
                  req_remarks: entry.req_remarks || null
                })
              }
              // If allocated, skip update (material cannot be modified)
            } else {
              // Create new material
              await createBPDMaterial({
                bpd_id: selectedDetail.bpd_id,
                m_id: entry.m_id as number,
                r_qty: entry.r_qty ? parseInt(entry.r_qty) : 0,
                req_remarks: entry.req_remarks || null,
                status: 0
              })
            }
          }
        }

        // Update act_qty and act_remarks for completed steps (status === 2)
        if (selectedDetail.status === 2) {
          for (const [bpdmId, actQty] of Object.entries(materialActQtys)) {
            if (actQty && actQty.trim() !== '') {
              const actRemarks = materialActRemarks[parseInt(bpdmId)] || null
              await updateBPDMaterial(parseInt(bpdmId), {
                act_qty: parseInt(actQty),
                act_remarks: actRemarks && actRemarks.trim() !== '' ? actRemarks : null
              })
            }
          }
        }

        await refetchMaterials()
        await refetchAllMaterials()
      }

      // Note: No need to call refetchDetails() here because:
      // - updateBusinessPlanDetail, startBusinessPlanDetail, and completeBusinessPlanDetail
      //   all already refetch the details inside their hook implementations
      // - This was causing duplicate requests and UI flickering

      // Check if all steps are now completed and mark business plan as complete
      let projectWasCompleted = false
      if (actionType === 'complete' && selectedBusinessPlan && selectedBusinessPlan.id) {
        // Wait a moment for the backend to process the completion, then fetch the latest details directly from API
        // We do a direct API call here instead of relying on hook state to ensure we have the most up-to-date data
        await new Promise(resolve => setTimeout(resolve, 100)) // Small delay to ensure backend processing completes
        
        try {
          const latestDetailsResponse = await apiClient.getBusinessPlanDetails({ 
            proj_id: selectedBusinessPlan.id, 
            all: true 
          })
          
          if (latestDetailsResponse.success && latestDetailsResponse.data) {
            const latestDetails = Array.isArray(latestDetailsResponse.data)
              ? latestDetailsResponse.data
              : (latestDetailsResponse.data as any).details || []
            
            // Check if all steps are completed (status === 2)
            const allStepsCompleted = latestDetails.length > 0 && latestDetails.every((detail: any) => detail.status === 2)
            
            // Only mark as complete if all steps are done and project is not already completed
            if (allStepsCompleted && selectedBusinessPlan.status !== 2) {
              // All steps are completed, mark the business plan as complete using the complete action endpoint
              let markedAsComplete = false
              
              try {
                const completeResult = await completeBusinessPlan(selectedBusinessPlan.id)
                
                if (completeResult && completeResult.status === 2) {
                  markedAsComplete = true
                  projectWasCompleted = true
                }
              } catch {
                // Silently handle error - project completion is a best-effort operation
                // The step was already completed successfully
              }
              
              // If we successfully marked as complete, refresh and show message
              if (markedAsComplete) {
                // Refetch business plans list to update the status
                await refetchBusinessPlans()
                
                // Clear the selected business plan since completed projects (status 2) 
                // won't appear in the filtered list (status 1 only)
                setSelectedBusinessPlan(null)
                
                // Show success message
                toast({
                  title: 'Project Completed',
                  description: 'All steps are completed. The project has been marked as complete.',
                })
              }
            }
          }
        } catch {
          // Don't block the flow - step completion succeeded, project completion is best-effort
        }
      }

      // Refresh the selected business plan to get updated status
      // Skip this if the project was just completed (it's no longer in the list)
      // Normalize the API response to match BusinessPlan type structure
      if (!projectWasCompleted && selectedBusinessPlan && selectedBusinessPlan.id && typeof selectedBusinessPlan.id === 'number') {
        try {
          const updated = await apiClient.getBusinessPlan(selectedBusinessPlan.id)
          if (updated.success && updated.data) {
            // Normalize the response to ensure id field is set correctly
            // API returns proj_id and proj_name, but we need id and name
            // Include all fields including estimated completion dates
            const apiData = updated.data as any
            const normalized = {
              id: apiData.proj_id || apiData.id,
              ptype_id: apiData.ptype_id,
              dept_id: apiData.dept_id,
              department_name: apiData.department_name || apiData.department?.name,
              sd_id: typeof apiData.sd_id === 'number' ? apiData.sd_id : 0,
              sub_division_name: apiData.sub_division_name || apiData.sub_division?.name,
              fs_id: apiData.fs_id !== undefined ? apiData.fs_id : null,
              funding_source_name: apiData.funding_source_name || apiData.funding_source?.fs_name || apiData.funding_source?.name,
              name: apiData.proj_name || apiData.name,
              start_date: apiData.start_date || null,
              completion_date: apiData.completion_date || null,
              est_completion_date: apiData.est_completion_date !== undefined ? apiData.est_completion_date : null,
              total_days: apiData.total_days !== undefined ? apiData.total_days : null,
              new_est_completion_date: apiData.new_est_completion_date !== undefined ? apiData.new_est_completion_date : null,
              tar_date: apiData.tar_date || null,
              status: apiData.status !== undefined ? apiData.status : 0,
              created_at: apiData.created_at,
              project_type: apiData.project_type ? {
                id: apiData.project_type.ptype_id || apiData.project_type.id,
                name: apiData.project_type.ptype_name || apiData.project_type.name,
                created_at: apiData.project_type.created_at || '',
                updated_at: apiData.project_type.updated_at || '',
              } : undefined,
              department: apiData.department ? {
                dept_id: apiData.department.dept_id,
                name: apiData.department.name,
                description: apiData.department.description,
                created_at: apiData.department.created_at || '',
                updated_at: apiData.department.updated_at || '',
              } : undefined,
              sub_division: apiData.sub_division ? {
                id: apiData.sub_division.id,
                division_id: apiData.sub_division.division_id,
                name: apiData.sub_division.name,
                description: apiData.sub_division.description,
                updated_by: apiData.sub_division.updated_by,
                updated_by_username: apiData.sub_division.updated_by_username,
                created_at: apiData.sub_division.created_at,
                updated_at: apiData.sub_division.updated_at,
              } : undefined,
            }
            setSelectedBusinessPlan(normalized as BusinessPlan)
          }
        } catch {
          // Don't block the flow - the details are already refreshed
        }
      }

      // Close dialog and reset state only after everything is updated
      setRemarksDialogOpen(false)
      setRemarks('')
      setActCost('')
      setStartedAt('')
      setCompletedAt('')
      setDelayEntries([])
      setMaterialEntries([])
      setMaterialActQtys({})
      setMaterialActRemarks({})
      setSelectedDetail(null)
      setSubmitError(null)
    } catch (error: any) {
      // Extract server error message - only show inline, no toast or console
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        String(error)

      setSubmitError(apiMessage)
    } finally {
      setIsUpdating(false)
    }
  }

  // Check permissions
  if (!hasShowPermission) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">Access Denied</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">You do not have permission to view this page</p>
      </div>
    )
  }

  return (
    <div className="relative -mx-6 px-6">
      <div className="flex h-full gap-6 w-full min-w-[1000px]">
        {/* Left Sidebar - Business Plans List */}
        <div className="w-70 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-800">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Update Progress</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Select a started project to update progress</p>
            </div>
            
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search business plans..."
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
                        <span className="truncate max-w-[120px]">{item.field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} {getOperatorDisplay(item.operator)}</span>
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

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {error && (
              <div className="m-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin mb-2 text-gray-400 dark:text-gray-500" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading business plans...</p>
              </div>
            ) : filteredBusinessPlans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No started projects found</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{hasActiveFilters ? 'Try adjusting your filters' : 'All projects have been completed or there are no started projects'}</p>
              </div>
            ) : (
              <div className="p-2">
                {filteredBusinessPlans.map((businessPlan) => (
                  <div
                    key={businessPlan.id}
                    onClick={() => setSelectedBusinessPlan(selectedBusinessPlan?.id === businessPlan.id ? null : businessPlan)}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-all mb-2 border",
                      selectedBusinessPlan?.id === businessPlan.id
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-sm"
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">{businessPlan.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          ID: {businessPlan.id} • {getProjectTypeName(businessPlan.ptype_id)} • {getDepartmentName(businessPlan)}
                        </div>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(businessPlan.status)}`}>
                            {getStatusDisplay(businessPlan.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area - Master and Detail */}
        <div className="flex-1 min-w-0 overflow-y-auto w-full custom-scrollbar">
          {selectedBusinessPlan ? (
            <div className="space-y-6 w-full">
              {/* Master Info - Inline, non-table layout */}
              <div className="rounded-md border border-gray-200 dark:border-gray-800 bg-transparent shadow-none p-4 w-full">
                <div className="mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Business Plan</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedBusinessPlan.name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-500 dark:text-gray-400 w-24">ID</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedBusinessPlan.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-500 dark:text-gray-400 w-24">Project Type</span>
                    <span className="font-medium text-gray-900 dark:text-white">{getProjectTypeName(selectedBusinessPlan.ptype_id)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-500 dark:text-gray-400 w-24">Department</span>
                    <span className="font-medium text-gray-900 dark:text-white">{getDepartmentName(selectedBusinessPlan)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-500 dark:text-gray-400 w-24">Funding Source</span>
                    <span className="font-medium text-gray-900 dark:text-white">{getFundingSourceName(selectedBusinessPlan)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-500 dark:text-gray-400 w-24">Start Date</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedBusinessPlan.start_date ? formatDate(selectedBusinessPlan.start_date) : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-500 dark:text-gray-400 w-24">Completion Date</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedBusinessPlan.completion_date ? formatDate(selectedBusinessPlan.completion_date) : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-500 dark:text-gray-400 w-24">Target Date</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedBusinessPlan.tar_date ? formatDate(selectedBusinessPlan.tar_date) : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-500 dark:text-gray-400 w-24">Created</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatDate(selectedBusinessPlan.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-500 dark:text-gray-400 w-24">Total Steps</span>
                    <span className="font-medium text-gray-900 dark:text-white">{businessPlanDetails.length}</span>
                  </div>
                  {selectedBusinessPlan.start_date && selectedBusinessPlan.total_days !== null && selectedBusinessPlan.status !== 2 && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400 w-24">Project Duration</span>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedBusinessPlan.total_days} day(s)</span>
                    </div>
                  )}
                  {selectedBusinessPlan.start_date && selectedBusinessPlan.est_completion_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400 w-24">Est. Completion</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatDate(selectedBusinessPlan.est_completion_date)}</span>
                    </div>
                  )}
                  {selectedBusinessPlan.start_date && selectedBusinessPlan.new_est_completion_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400 w-24">New Est. Completion</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatDate(selectedBusinessPlan.new_est_completion_date)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-500 dark:text-gray-400 w-24">Status</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(selectedBusinessPlan.status)}`}>
                      {getStatusDisplay(selectedBusinessPlan.status)}
                    </span>
                  </div>
                  {selectedBusinessPlan.status === 3 && selectedBusinessPlan.cancellation_date && (
                    <>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <span className="text-gray-500 dark:text-gray-400 w-24">Cancellation Date</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatDate(selectedBusinessPlan.cancellation_date)}
                        </span>
                      </div>
                      {selectedBusinessPlan.cancellation_reason && (
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-500 dark:text-gray-400 w-24 flex-shrink-0">Cancellation Reason</span>
                          <span className="font-medium text-gray-900 dark:text-white break-words whitespace-normal flex-1 min-w-0">
                            {selectedBusinessPlan.cancellation_reason}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Detail Table - Business Plan Details */}
              <Card className="w-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <ListChecks className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        Execution Steps
                      </CardTitle>
                      <CardDescription>Steps and progress for this business plan</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {businessPlanDetailsLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin mb-2 text-gray-400 dark:text-gray-500" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading business plan details...</p>
                    </div>
                  ) : businessPlanDetails.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">No steps defined</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">No steps have been configured for this business plan</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Summary Section */}
                      {businessPlanDetails.length > 0 && (
                        <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-900/20 dark:to-gray-900/50 shadow-md">
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              Execution Summary
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Completion Percentage */}
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                  Completion
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="relative w-16 h-16">
                                    <svg className="transform -rotate-90 w-16 h-16">
                                      <circle
                                        cx="32"
                                        cy="32"
                                        r="28"
                                        stroke="currentColor"
                                        strokeWidth="6"
                                        fill="none"
                                        className="text-gray-200 dark:text-gray-700"
                                      />
                                      <circle
                                        cx="32"
                                        cy="32"
                                        r="28"
                                        stroke="currentColor"
                                        strokeWidth="6"
                                        fill="none"
                                        strokeDasharray={`${2 * Math.PI * 28}`}
                                        strokeDashoffset={`${2 * Math.PI * 28 * (1 - completionPercentage / 100)}`}
                                        className={`transition-all duration-500 ${
                                          completionPercentage === 100
                                            ? 'text-green-600 dark:text-green-400'
                                            : completionPercentage >= 50
                                            ? 'text-blue-600 dark:text-blue-400'
                                            : 'text-yellow-600 dark:text-yellow-400'
                                        }`}
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                                        {completionPercentage}%
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                      {businessPlanDetails.filter(d => d.status === 2).length} of {businessPlanDetails.length} steps
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                      completed
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {/* Current Steps */}
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                  Current {currentSteps.length === 1 ? 'Step' : 'Steps'} {currentSteps.length > 0 && `(${currentSteps.length})`}
                                </div>
                                {currentSteps.length > 0 ? (
                                  <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {currentSteps.map((step) => (
                                      <div key={step.bpd_id} className="flex items-center gap-2">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white font-bold text-sm shadow-md flex-shrink-0">
                                          {step.order || 0}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="font-semibold text-gray-900 dark:text-white truncate">
                                            {step.step?.name || 'N/A'}
                                          </div>
                                          <div className="text-xs text-gray-600 dark:text-gray-400">
                                            {getStatusDisplay(step.status)}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                                    N/A
                                  </div>
                                )}
                              </div>

                              {/* Status */}
                              {currentSteps.length > 0 && (
                                <div className="space-y-2">
                                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Current {currentSteps.length === 1 ? 'Step' : 'Steps'} Status
                                  </div>
                                  {(() => {
                                    // Calculate overall status: if any step is delayed, show delayed
                                    const stepResults = currentSteps.map(step => getStepResult(step))
                                    const hasDelayed = stepResults.some(r => r.status === 'delayed')
                                    
                                    if (currentSteps.length === 1) {
                                      // Single step: show detailed status
                                      const result = stepResults[0]
                                      const isOnTrack = result.status === 'on-time' || result.status === 'pending'
                                      return (
                                        <div className="flex items-center gap-2">
                                          {isOnTrack ? (
                                            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                                          ) : (
                                            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                                          )}
                                          <div>
                                            <div className={`font-semibold ${
                                              isOnTrack 
                                                ? 'text-green-700 dark:text-green-300' 
                                                : 'text-red-700 dark:text-red-300'
                                            }`}>
                                              {isOnTrack ? 'On Track' : 'Delayed'}
                                            </div>
                                            {result.status === 'delayed' && currentSteps[0].completed_at && (
                                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                                Completed: {formatDate(currentSteps[0].completed_at)}
                                              </div>
                                            )}
                                            {result.status === 'delayed' && !currentSteps[0].completed_at && currentSteps[0].due_date && (
                                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                                Due: {formatDate(currentSteps[0].due_date)}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    } else {
                                      // Multiple steps: show summary
                                      const onTrackCount = stepResults.filter(r => r.status === 'on-time' || r.status === 'pending').length
                                      return (
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                            {hasDelayed ? (
                                              <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                                            ) : (
                                              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                                            )}
                                            <div>
                                              <div className={`font-semibold ${
                                                hasDelayed 
                                                  ? 'text-red-700 dark:text-red-300' 
                                                  : 'text-green-700 dark:text-green-300'
                                              }`}>
                                                {hasDelayed ? `${currentSteps.length - onTrackCount} Delayed` : 'All On Track'}
                                              </div>
                                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                                {onTrackCount} of {currentSteps.length} on track
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    }
                                  })()}
                                </div>
                              )}

                              {/* Next Step */}
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                  Next Step
                                </div>
                                {nextStep ? (
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm">
                                      {nextStep.order || 0}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-gray-900 dark:text-white">
                                        {nextStep.step?.name || 'N/A'}
                                      </div>
                                      <div className="text-xs text-gray-600 dark:text-gray-400">
                                        {getStatusDisplay(nextStep.status)}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                                    No more steps
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Detail Cards */}
                      <div className="relative">
                        {businessPlanDetails.map((detail, index) => {
                        const delays = delaysByBpdId[detail.bpd_id] || []
                        const materials = materialsByBpdId[detail.bpd_id] || []
                        // Debug: log materials for this detail
                        // console.log(`Detail ${detail.bpd_id} materials:`, materials, 'All materials:', allBPDMaterials.length)
                        const isLast = index === businessPlanDetails.length - 1
                        const isExpanded = expandedCards.has(detail.bpd_id)
                        const toggleExpand = () => {
                          setExpandedCards(prev => {
                            const newSet = new Set(prev)
                            if (newSet.has(detail.bpd_id)) {
                              newSet.delete(detail.bpd_id)
                            } else {
                              newSet.add(detail.bpd_id)
                            }
                            return newSet
                          })
                        }
                        return (
                          <div key={detail.bpd_id} className="relative">
                            <Card className="overflow-hidden border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 relative z-10 bg-white dark:bg-gray-900/50 backdrop-blur-sm">
                            <CardHeader 
                              className="pb-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                              onClick={toggleExpand}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white font-bold text-sm shadow-md ring-2 ring-blue-200 dark:ring-blue-800">
                                      {detail.order || 0}
                                    </div>
                                    <CardTitle className="text-lg">{detail.step?.name || 'N/A'}</CardTitle>
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(detail.status)}`}>
                                      {getStatusDisplay(detail.status)}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex gap-2 items-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleExpand()
                                    }}
                                    className="h-8 w-8 p-0"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </Button>
                                  {hasEditPermission && detail.status === 0 && (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => handleStartOrComplete(detail)}
                                      disabled={!canStartStep(detail)}
                                      className={!canStartStep(detail) 
                                        ? "!bg-gray-400 !hover:bg-gray-400 !text-white !cursor-not-allowed !opacity-100 disabled:!bg-gray-400 disabled:!text-white disabled:!opacity-100" 
                                        : "bg-blue-600 hover:bg-blue-700 text-white"}
                                      title={!canStartStep(detail) ? 'All prerequisite steps must be completed first' : 'Start this step'}
                                    >
                                      <Play className="h-4 w-4 mr-1.5" />
                                      Start
                                    </Button>
                                  )}
                                  {hasEditPermission && detail.status === 1 && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleEdit(detail)
                                        }}
                                        className="border-gray-300 dark:border-gray-600"
                                      >
                                        <Edit className="h-4 w-4 mr-1.5" />
                                        Edit
                                      </Button>
                                      <TooltipProvider delayDuration={200}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className="inline-block">
                                              <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => handleStartOrComplete(detail)}
                                                disabled={!canCompleteStep(detail)}
                                                className={!canCompleteStep(detail)
                                                  ? "!bg-gray-400 !hover:bg-gray-400 !text-white !cursor-not-allowed !opacity-100 disabled:!bg-gray-400 disabled:!text-white disabled:!opacity-100"
                                                  : "bg-green-600 hover:bg-green-700 text-white"}
                                              >
                                                <CheckCircle className="h-4 w-4 mr-1.5" />
                                                Complete
                                              </Button>
                                            </span>
                                          </TooltipTrigger>
                                          {!canCompleteStep(detail) && (
                                            <TooltipContent 
                                              side="bottom" 
                                              sideOffset={8}
                                              className="max-w-sm whitespace-normal"
                                              align="center"
                                            >
                                              <p className="whitespace-normal break-words">
                                                All materials must be allocated before completing this step
                                              </p>
                                            </TooltipContent>
                                          )}
                                        </Tooltip>
                                      </TooltipProvider>
                                    </>
                                  )}
                                  {hasEditPermission && detail.status === 2 && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleEdit(detail)
                                      }}
                                      className="border-gray-300 dark:border-gray-600"
                                    >
                                      <Edit className="h-4 w-4 mr-1.5" />
                                      Edit
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            {isExpanded && (
                              <CardContent className="pt-0 animate-in slide-in-from-top-2 duration-300">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
                                {/* Basic Info */}
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    <DollarSign className="h-3.5 w-3.5" />
                                    Basic Information
                                  </div>
                                  <div className="space-y-2.5 text-sm">
                                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800">
                                      <span className="text-gray-600 dark:text-gray-400">Weightage:</span>
                                      <span className="font-semibold text-gray-900 dark:text-white">{detail.weightage}%</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800">
                                      <span className="text-gray-600 dark:text-gray-400">Target Time:</span>
                                      <span className="font-semibold text-gray-900 dark:text-white">{detail.t_days} day(s)</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800">
                                      <span className="text-gray-600 dark:text-gray-400">Est. Cost (Budget):</span>
                                      <span className="font-semibold text-gray-900 dark:text-white">{CURRENCY_SYMBOL} {detail.est_cost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1.5">
                                      <span className="text-gray-600 dark:text-gray-400">Actual Cost:</span>
                                      <span className="font-semibold text-gray-900 dark:text-white">
                                        {detail.act_cost != null ? `${CURRENCY_SYMBOL} ${detail.act_cost.toLocaleString()}` : 'N/A'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Dates */}
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    <Clock className="h-3.5 w-3.5" />
                                    Timeline
                                  </div>
                                  <div className="space-y-2.5 text-sm">
                                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800">
                                      <span className="text-gray-600 dark:text-gray-400">Started At:</span>
                                      <span className="font-semibold text-gray-900 dark:text-white">
                                        {detail.started_at ? formatDate(detail.started_at) : 'N/A'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800">
                                      <span className="text-gray-600 dark:text-gray-400">Due Date:</span>
                                      <span className="font-semibold text-gray-900 dark:text-white">
                                        {detail.due_date ? formatDate(detail.due_date) : 'N/A'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800">
                                      <span className="text-gray-600 dark:text-gray-400">Completed At:</span>
                                      <span className="font-semibold text-gray-900 dark:text-white">
                                        {detail.completed_at ? formatDate(detail.completed_at) : 'N/A'}
                                      </span>
                                    </div>
                                    {(() => {
                                      const result = getStepResult(detail)
                                      return (
                                        <div className="flex justify-between items-center py-1.5">
                                          <span className="text-gray-600 dark:text-gray-400">Result:</span>
                                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            result.status === 'on-time'
                                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                              : result.status === 'delayed'
                                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                              : result.status === 'pending'
                                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                          }`}>
                                            {result.label}
                                          </span>
                                        </div>
                                      )
                                    })()}
                                  </div>
                                </div>

                                {/* Remarks */}
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    <FileText className="h-3.5 w-3.5" />
                                    Remarks
                                  </div>
                                  <div className="space-y-3 text-sm">
                                    <div>
                                      <span className="text-gray-600 dark:text-gray-400 block mb-1.5 text-xs font-medium uppercase tracking-wide">Starting Remarks:</span>
                                      <p className="text-gray-900 dark:text-white font-medium bg-gray-50 dark:bg-gray-800/50 p-2 rounded-md text-sm">
                                        {detail.remarks_1 || 'N/A'}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-gray-600 dark:text-gray-400 block mb-1.5 text-xs font-medium uppercase tracking-wide">Completion Remarks:</span>
                                      <p className="text-gray-900 dark:text-white font-medium bg-gray-50 dark:bg-gray-800/50 p-2 rounded-md text-sm">
                                        {detail.remarks_2 || 'N/A'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Prerequisites Section */}
                              {(() => {
                                const prerequisites = bpDetailPtsByBpdId.get(detail.bpd_id) || []
                                const isPrerequisitesExpanded = expandedPrerequisites.has(detail.bpd_id)
                                if (prerequisites.length === 0) return null

                                return (
                                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <div 
                                      className="flex items-center gap-2 mb-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-md p-2 -m-2 transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setExpandedPrerequisites(prev => {
                                          const newSet = new Set(prev)
                                          if (newSet.has(detail.bpd_id)) {
                                            newSet.delete(detail.bpd_id)
                                          } else {
                                            newSet.add(detail.bpd_id)
                                          }
                                          return newSet
                                        })
                                      }}
                                    >
                                      <ChevronRight className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isPrerequisitesExpanded ? 'rotate-90' : ''}`} />
                                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex-1">
                                        Required Steps (Prerequisites) ({prerequisites.length})
                                      </div>
                                      {isPrerequisitesExpanded ? (
                                        <ChevronUp className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                      )}
                                    </div>
                                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isPrerequisitesExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                      <div className="space-y-2 pt-2">
                                        {prerequisites.map((pts) => {
                                          // Find the business plan detail for this prerequisite step
                                          const prerequisiteDetail = businessPlanDetails.find(bpd => bpd.s_id === pts.step_id)
                                          const isCompleted = prerequisiteDetail?.status === 2
                                          
                                          return (
                                            <div key={pts.ptsd_id} className={`p-3 border rounded-lg ${
                                              isCompleted 
                                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                                                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                            }`}>
                                              <div className="flex items-center gap-2">
                                                {isCompleted ? (
                                                  <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                                ) : (
                                                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                                                )}
                                                <span className={`text-sm font-medium flex-1 ${
                                                  isCompleted 
                                                    ? 'text-green-900 dark:text-green-200' 
                                                    : 'text-blue-900 dark:text-blue-200'
                                                }`}>
                                                  {getStepName(pts.step_id)}
                                                </span>
                                                <span className={`text-xs italic ${
                                                  isCompleted 
                                                    ? 'text-green-600 dark:text-green-400' 
                                                    : 'text-blue-600 dark:text-blue-400'
                                                }`}>
                                                  {isCompleted ? '(completed)' : '(required)'}
                                                </span>
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })()}

                              {/* Materials Section */}
                              {materials.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                      Materials ({materials.length})
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    {materials.map((material) => (
                                      <div key={material.bpdm_id} className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex items-center gap-2 flex-1">
                                            <Package className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                            <span className="font-medium text-blue-900 dark:text-blue-200 text-sm">
                                              {material.material?.name || 'Unknown Material'}
                                            </span>
                                          </div>
                                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            material.status === 0
                                              ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                              : material.status === 1
                                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                          }`}>
                                            {material.status === 0 ? 'Required' : material.status === 1 ? 'Allocated' : 'Installed'}
                                          </span>
                                        </div>
                                        <div className="space-y-1.5 pl-5 text-sm">
                                          <div className="flex justify-between items-center">
                                            <span className="text-blue-700 dark:text-blue-300">Required Qty:</span>
                                            <span className="font-semibold text-blue-900 dark:text-blue-200">{material.r_qty}</span>
                                          </div>
                                          {material.req_remarks && (
                                            <div className="text-xs text-blue-600 dark:text-blue-400 italic pl-2 border-l-2 border-blue-300 dark:border-blue-700">
                                              <span className="font-medium">Required Remarks:</span> {material.req_remarks}
                                            </div>
                                          )}
                                          {material.alloc_qty != null && (
                                            <div className="flex justify-between items-center">
                                              <span className="text-yellow-700 dark:text-yellow-300">Allocated Qty:</span>
                                              <span className="font-semibold text-yellow-900 dark:text-yellow-200">{material.alloc_qty}</span>
                                            </div>
                                          )}
                                          {(material.status === 1 || material.alloc_qty != null) && (
                                            <div className="text-xs text-yellow-600 dark:text-yellow-400 italic pl-2 border-l-2 border-yellow-300 dark:border-yellow-700">
                                              <span className="font-medium">Allocation Remarks:</span> {material.alloc_remarks || 'N/A'}
                                            </div>
                                          )}
                                          {material.act_qty != null && (
                                            <div className="flex justify-between items-center">
                                              <span className="text-green-700 dark:text-green-300">Actual Qty Used:</span>
                                              <span className="font-semibold text-green-900 dark:text-green-200">{material.act_qty}</span>
                                            </div>
                                          )}
                                          {material.act_remarks && (
                                            <div className="text-xs text-green-600 dark:text-green-400 italic pl-2 border-l-2 border-green-300 dark:border-green-700">
                                              <span className="font-medium">Actual Remarks:</span> {material.act_remarks}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Delays Section */}
                              {delays.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                  <div className="flex items-center gap-2 mb-3">
                                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                      Delay Reasons ({delays.length})
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    {delays.map((delay) => (
                                      <div key={delay.bpdd_id} className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                                        <div className="flex items-start justify-between mb-1">
                                          <div className="flex items-center gap-2">
                                            <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                            <span className="font-medium text-amber-900 dark:text-amber-200 text-sm">
                                              {delay.delay_reason?.name || 'Unknown Delay Reason'}
                                            </span>
                                          </div>
                                          <span className="text-xs text-amber-700 dark:text-amber-300 flex-shrink-0 ml-2">
                                            {formatDate(delay.created_at)}
                                          </span>
                                        </div>
                                        {delay.remarks && (
                                          <p className="text-sm text-amber-800 dark:text-amber-300 mt-1.5 pl-5">{delay.remarks}</p>
                                        )}
                                        {delay.created_by_username && (
                                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 pl-5">
                                            Recorded by: {delay.created_by_username}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              </CardContent>
                            )}
                          </Card>
                          {!isLast && (
                            <div className="flex justify-center items-center py-4 relative z-10">
                              <div className="flex flex-col items-center">
                                {/* Top connecting line */}
                                <div className="w-0.5 h-6 bg-gradient-to-b from-blue-300 via-blue-400 to-blue-500 dark:from-blue-700 dark:via-blue-600 dark:to-blue-500"></div>
                                
                                {/* Arrow connector with circle */}
                                <div className="relative flex items-center justify-center">
                                  <div className="absolute w-12 h-0.5 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400 dark:from-blue-600 dark:via-blue-500 dark:to-blue-600"></div>
                                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 border-2 border-blue-400 dark:border-blue-600 shadow-md backdrop-blur-sm relative z-10">
                                    <ArrowDown className="h-6 w-6 text-blue-600 dark:text-blue-400 drop-shadow-sm" />
                                  </div>
                                </div>
                                
                                {/* Bottom connecting line */}
                                <div className="w-0.5 h-6 bg-gradient-to-b from-blue-500 via-blue-400 to-blue-300 dark:from-blue-500 dark:via-blue-600 dark:to-blue-700"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                      })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select a project</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Choose a project from the list to view its details</p>
            </div>
          )}
        </div>
      </div>

      <AdvancedFilterDialog
        isOpen={isFilterDialogOpen}
        onClose={() => setIsFilterDialogOpen(false)}
        onApplyFilters={() => {}}
        filterModel={filterModel}
        onFilterModelChange={setFilterModel}
        fields={businessPlanFilterFields}
        getOperatorsForField={getBusinessPlanOperatorsForField}
        getValueInput={getBusinessPlanValueInput}
      />

      {/* Remarks Dialog */}
      <Dialog open={remarksDialogOpen} onOpenChange={(open) => {
        if (!open && isUpdating) return
        setRemarksDialogOpen(open)
        if (!open) setSubmitError(null) // Clear error when dialog closes
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'start' ? 'Start Step' : actionType === 'complete' ? 'Complete Step' : 'Edit Step'}
            </DialogTitle>
            {selectedDetail && (
              <div className="mb-2 text-sm">
                <span className="font-medium text-gray-900 dark:text-white">Step: </span>
                <span className="text-gray-700 dark:text-gray-300">{selectedDetail.step?.name || 'N/A'}</span>
              </div>
            )}
            <DialogDescription>
              {actionType === 'start' 
                ? 'Enter the start date and remarks for starting this step.'
                : actionType === 'edit'
                  ? 'Edit remarks and materials for this step.'
                  : selectedDetail && isEstTimePast(selectedDetail)
                    ? 'The estimated completion time has passed. Please provide completion date, remarks, and delay reasons below.'
                    : 'Enter the completion date and remarks for completing this step.'}
            </DialogDescription>
          </DialogHeader>
          {submitError && (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
          <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Date Input Fields */}
            {actionType === 'start' && (
              <div>
                <Label htmlFor="startedAt" className="mb-2">
                  Start Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="startedAt"
                  type="date"
                  value={startedAt}
                  onChange={(e) => setStartedAt(e.target.value)}
                  className="w-full"
                  required
                />
              </div>
            )}
            {actionType === 'complete' && (
              <div>
                <Label htmlFor="completedAt" className="mb-2">
                  Completion Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="completedAt"
                  type="date"
                  value={completedAt}
                  onChange={(e) => setCompletedAt(e.target.value)}
                  className="w-full"
                  required
                />
              </div>
            )}
            {/* Materials Section - Start Dialog and Edit Dialog (for started steps) */}
            {/* Materials are optional when starting a step - commented out for start action */}
            {/* {(actionType === 'start' || (actionType === 'edit' && selectedDetail?.status === 1)) && ( */}
            {/* COMMENTED OUT: Materials UI for edit dialog (started steps) */}
            {/* {((actionType === 'edit' && selectedDetail?.status === 1)) && (
              <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Material Requirements (Optional)
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddMaterialEntry}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Material
                  </Button>
                </div>
                {materialEntries.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No materials added. Click "Add Material" to add material requirements.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {materialEntries.map((entry, index) => {
                      // Check if this entry corresponds to an existing material with status 1 (allocated)
                      // Filter to ensure we only check materials from the current step
                      const validMaterials = selectedDetail ? existingMaterials.filter(m => m.bpd_id === selectedDetail.bpd_id) : []
                      const existingMaterial = actionType === 'edit' && selectedDetail?.status === 1
                        ? validMaterials.find(m => m.m_id === entry.m_id)
                        : null
                      const isAllocated = existingMaterial?.status === 1
                      
                      return (
                      <div key={index} className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3 ${isAllocated ? 'opacity-75' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Material {index + 1}</span>
                          {isAllocated && (
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Allocated</span>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMaterialEntry(index)}
                            disabled={isAllocated}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={isAllocated ? 'Cannot delete allocated material' : 'Remove material'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`material-${index}`} className="text-xs mb-1">
                              Material <span className="text-red-500">*</span>
                            </Label>
                            <Select
                              value={entry.m_id.toString()}
                              onValueChange={(value) => handleMaterialEntryChange(index, 'm_id', value === '' ? '' : parseInt(value))}
                              disabled={isAllocated}
                            >
                              <SelectTrigger id={`material-${index}`} className="h-9" disabled={isAllocated}>
                                <SelectValue placeholder="Select material" />
                              </SelectTrigger>
                              <SelectContent>
                                {materials.map((material) => (
                                  <SelectItem key={material.id} value={material.id.toString()}>
                                    {material.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {isAllocated && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Material cannot be changed once allocated
                              </p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor={`r_qty-${index}`} className="text-xs mb-1">
                              Required Quantity <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`r_qty-${index}`}
                              type="number"
                              step="1"
                              min="1"
                              placeholder="Enter quantity"
                              value={entry.r_qty}
                              onChange={(e) => handleMaterialEntryChange(index, 'r_qty', e.target.value)}
                              className="h-9"
                              required
                              disabled={isAllocated}
                            />
                            {isAllocated && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Quantity cannot be changed once allocated
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`req_remarks-${index}`} className="text-xs mb-1">
                            Required Remarks
                          </Label>
                          <Textarea
                            id={`req_remarks-${index}`}
                            placeholder="Enter remarks for material requirement..."
                            value={entry.req_remarks}
                            onChange={(e) => handleMaterialEntryChange(index, 'req_remarks', e.target.value)}
                            rows={2}
                            className="w-full text-sm"
                            disabled={isAllocated}
                          />
                          {isAllocated && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Remarks cannot be changed once allocated
                            </p>
                          )}
                        </div>
                      </div>
                    )})}
                  </div>
                )}
              </div>
            )} */}

            {(actionType === 'complete' || (actionType === 'edit' && selectedDetail?.status === 2)) && (
              <div>
                <Label htmlFor="actCost" className="mb-2">
                  Actual Cost ({CURRENCY_SYMBOL})
                </Label>
                <Input
                  id="actCost"
                  type="number"
                  placeholder="Enter actual cost..."
                  value={actCost}
                  onChange={(e) => setActCost(e.target.value)}
                  min="0"
                  step="1"
                  className="w-full"
                />
              </div>
            )}

            {/* Materials Section - Complete Dialog and Edit Dialog (for completed steps) */}
            {/* COMMENTED OUT: Materials UI for edit dialog (completed steps) */}
            {/* {(actionType === 'complete' || (actionType === 'edit' && selectedDetail?.status === 2)) && (() => {
              // Filter materials to ensure they belong to the current selectedDetail
              const validMaterials = selectedDetail ? existingMaterials.filter(m => m.bpd_id === selectedDetail.bpd_id) : []
              return validMaterials.length > 0
            })() && (
              <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                <Label className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Material Usage
                </Label>
                <div className="space-y-3">
                  {existingMaterials.filter(m => selectedDetail && m.bpd_id === selectedDetail.bpd_id).map((material) => (
                    <div key={material.bpdm_id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {material.material?.name || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Required: {material.r_qty} {material.req_remarks ? `- ${material.req_remarks}` : ''}
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor={`act_qty-${material.bpdm_id}`} className="text-xs mb-1">
                          Actual Quantity Used <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id={`act_qty-${material.bpdm_id}`}
                          type="number"
                          step="1"
                          min="0"
                          placeholder="0"
                          required
                          value={materialActQtys[material.bpdm_id] || (material.act_qty ? Math.floor(material.act_qty).toString() : '')}
                          onChange={(e) => {
                            // Remove any decimal points and non-numeric characters except digits
                            const value = e.target.value
                            const numericValue = value.replace(/[^\d]/g, '')
                            setMaterialActQtys(prev => ({
                              ...prev,
                              [material.bpdm_id]: numericValue
                            }))
                          }}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`act_remarks-${material.bpdm_id}`} className="text-xs mb-1">
                          Completion Remarks
                        </Label>
                        <Textarea
                          id={`act_remarks-${material.bpdm_id}`}
                          placeholder="Enter remarks for material completion..."
                          value={materialActRemarks[material.bpdm_id] || (material.act_remarks || '')}
                          onChange={(e) => {
                            setMaterialActRemarks(prev => ({
                              ...prev,
                              [material.bpdm_id]: e.target.value
                            }))
                          }}
                          rows={2}
                          className="w-full text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )} */}

            {actionType === 'complete' && selectedDetail && isEstTimePast(selectedDetail) && (
              <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">
                    Delay Reasons <span className="text-red-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddDelayEntry}
                    className="h-8"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Delay Reason
                  </Button>
                </div>
                {delayEntries.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                    No delay reasons added. Click "Add Delay Reason" to add one.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {delayEntries.map((entry, index) => (
                      <div key={index} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Delay Reason {index + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveDelayEntry(index)}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div>
                          <Label htmlFor={`delay-reason-${index}`} className="text-xs mb-1">
                            Delay Reason <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={entry.delay_id === '' ? undefined : entry.delay_id.toString()}
                            onValueChange={(value) => handleDelayEntryChange(index, 'delay_id', parseInt(value))}
                          >
                            <SelectTrigger className="w-full" id={`delay-reason-${index}`}>
                              <SelectValue placeholder="Select delay reason..." />
                            </SelectTrigger>
                            <SelectContent>
                              {delayReasons.map((reason) => (
                                <SelectItem key={reason.id} value={reason.id.toString()}>
                                  {reason.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor={`delay-remarks-${index}`} className="text-xs mb-1">
                            Remarks
                          </Label>
                          <Textarea
                            id={`delay-remarks-${index}`}
                            placeholder="Enter remarks for this delay..."
                            value={entry.remarks}
                            onChange={(e) => handleDelayEntryChange(index, 'remarks', e.target.value)}
                            rows={2}
                            className="w-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div>
              <Label htmlFor="remarks" className="mb-2">
                {actionType === 'start' ? 'Starting Remarks' : actionType === 'edit' 
                  ? (selectedDetail?.status === 1 ? 'Starting Remarks' : 'Completion Remarks')
                  : 'Completion Remarks'}
              </Label>
              <Textarea
                id="remarks"
                placeholder={actionType === 'start' 
                  ? 'Enter starting remarks...' 
                  : actionType === 'edit'
                    ? (selectedDetail?.status === 1 ? 'Edit starting remarks...' : 'Edit completion remarks...')
                    : 'Enter completion remarks...'}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={4}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              if (isUpdating) return
              setRemarksDialogOpen(false)
              setRemarks('')
              setActCost('')
              setStartedAt('')
              setCompletedAt('')
              setDelayEntries([])
              setMaterialEntries([])
              setMaterialActQtys({})
              setSelectedDetail(null)
              setSubmitError(null)
            }} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleSubmitRemarks} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {actionType === 'start' ? 'Starting...' : actionType === 'edit' ? 'Saving...' : 'Completing...'}
                </>
              ) : (
                actionType === 'start' ? 'Start Step' : actionType === 'edit' ? 'Save Changes' : 'Complete Step'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
