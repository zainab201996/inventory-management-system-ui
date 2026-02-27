'use client'

import Link from 'next/link'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useBusinessPlans } from '@/hooks/use-business-plans'
import { useProjectTypes } from '@/hooks/use-project-types'
import { useFundingSources } from '@/hooks/use-funding-sources'
import { useSettings } from '@/hooks/use-settings'
import { useBusinessPlanDetails } from '@/hooks/use-business-plan-details'
import { useBPDDelays } from '@/hooks/use-bpd-delays'
import { useDepartments } from '@/hooks/use-departments'
import { useUserAccess } from '@/hooks/use-user-access'
import { formatDate, CURRENCY_SYMBOL, cn, getCurrentFinancialYearDates } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import { BusinessPlan, BusinessPlanDetail, BPDDelay, BusinessPlanFilters, PTSDetail } from '@/types'
import { Search, Loader2, Filter, X, ArrowUp, ArrowDown, ArrowUpDown, Clock, DollarSign, FileText, AlertCircle, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Calendar, Hash, Building2, Briefcase, Target, CheckCircle2, Layers, Tag, Wallet, ChevronRight, Check, XCircle } from 'lucide-react'
import { AdvancedFilterDialog, FilterField, FilterOperator } from '@/components/ui/advanced-filter-dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const projectFilterFields: FilterField[] = [
  { value: 'name', label: 'Project Name', type: 'text' },
  { value: 'project_type', label: 'Project Type', type: 'text' },
  { value: 'department', label: 'Department', type: 'text' },
  { value: 'start_date', label: 'Start Date', type: 'date' },
  { value: 'completion_date', label: 'Completion Date', type: 'date' },
  { value: 'created_at', label: 'Created Date', type: 'date' }
]

const getProjectOperatorsForField = (field: string): FilterOperator[] => {
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

export function ProjectsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [searchTerm, setSearchTerm] = useState('')
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterModel, setFilterModel] = useState({
    items: [] as Array<{ id: number; field: string; operator: string; value: any }>,
    logicOperator: 'and' as 'and' | 'or'
  })
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())
  
  // Master-Detail state
  const [selectedBusinessPlan, setSelectedBusinessPlan] = useState<BusinessPlan | null>(null)
  
  // Track if component has mounted to avoid updating URL on initial mount
  const isInitialMount = useRef(true)

  // Get settings first (needed for date defaults)
  const { settings } = useSettings()

  // Get initial filter values from URL params
  const initialPtypeId = useMemo(() => {
    const ptypeParam = searchParams.get('ptype_id')
    return ptypeParam || 'all'
  }, [searchParams])
  
  const initialFsId = useMemo(() => {
    const fsParam = searchParams.get('fs_id')
    if (fsParam === 'null') return 'null'
    return fsParam || 'all'
  }, [searchParams])
  
  const initialStatus = useMemo(() => {
    const statusParam = searchParams.get('status')
    return statusParam || 'all'
  }, [searchParams])
  
  const initialDeptId = useMemo(() => {
    const deptParam = searchParams.get('dept_id')
    return deptParam || 'all'
  }, [searchParams])
  
  const initialFromDate = useMemo(() => {
    const fromDateParam = searchParams.get('from_date')
    if (fromDateParam) return fromDateParam
    
    // Set default to current financial year if settings are available
    if (settings) {
      const yearStart = settings.year_start || '07-01'
      const yearEnd = settings.year_end || '06-30'
      const dates = getCurrentFinancialYearDates(yearStart, yearEnd)
      return dates?.from_date || ''
    }
    return ''
  }, [searchParams, settings])
  
  const initialToDate = useMemo(() => {
    const toDateParam = searchParams.get('to_date')
    if (toDateParam) return toDateParam
    
    // Set default to current financial year if settings are available
    if (settings) {
      const yearStart = settings.year_start || '07-01'
      const yearEnd = settings.year_end || '06-30'
      const dates = getCurrentFinancialYearDates(yearStart, yearEnd)
      return dates?.to_date || ''
    }
    return ''
  }, [searchParams, settings])

  const [ptypeIdFilter, setPtypeIdFilter] = useState<string>(initialPtypeId)
  const [fsIdFilter, setFsIdFilter] = useState<string>(initialFsId)
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus)
  const [deptIdFilter, setDeptIdFilter] = useState<string>(initialDeptId)
  const [fromDate, setFromDate] = useState<string>(initialFromDate)
  const [toDate, setToDate] = useState<string>(initialToDate)
  const datesInitialized = useRef(false)
  
  // Fetch all departments for filtering
  const { departments, loading: departmentsLoading } = useDepartments({ all: true })
  
  // Update dates when settings load and initial dates are empty (only once)
  useEffect(() => {
    if (settings && !datesInitialized.current && !fromDate && !toDate) {
      const yearStart = settings.year_start || '07-01'
      const yearEnd = settings.year_end || '06-30'
      const dates = getCurrentFinancialYearDates(yearStart, yearEnd)
      if (dates) {
        setFromDate(dates.from_date)
        setToDate(dates.to_date)
        datesInitialized.current = true
      }
    }
  }, [settings, fromDate, toDate])
  
  // Ref to track if we're updating from URL params (to prevent infinite loops)
  const isUpdatingFromUrl = useRef(false)
  
  // Update filters when URL params change
  useEffect(() => {
    isUpdatingFromUrl.current = true
    
    const ptypeParam = searchParams.get('ptype_id')
    const fsParam = searchParams.get('fs_id')
    const statusParam = searchParams.get('status')
    const deptParam = searchParams.get('dept_id')
    const fromDateParam = searchParams.get('from_date')
    const toDateParam = searchParams.get('to_date')
    if (ptypeParam !== null) {
      setPtypeIdFilter(ptypeParam || 'all')
    }
    if (fsParam !== null) {
      setFsIdFilter(fsParam === 'null' ? 'null' : fsParam || 'all')
    }
    if (statusParam !== null) {
      setStatusFilter(statusParam || 'all')
    }
    if (deptParam !== null) {
      setDeptIdFilter(deptParam || 'all')
    }
    // Only update dates from URL params - don't preserve if URL param is removed
    setFromDate(prev => {
      const newValue = fromDateParam || ''
      return prev !== newValue ? newValue : prev
    })
    setToDate(prev => {
      const newValue = toDateParam || ''
      return prev !== newValue ? newValue : prev
    })
    
    // Reset flag after a short delay to allow state updates to complete
    setTimeout(() => {
      isUpdatingFromUrl.current = false
    }, 0)
  }, [searchParams])

  // Sync filter changes to URL params
  useEffect(() => {
    // Skip if we're updating from URL params
    if (isUpdatingFromUrl.current) {
      return
    }
    
    // Skip URL update on initial mount (filters are already initialized from URL)
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    
    const params = new URLSearchParams()
    
    if (ptypeIdFilter !== 'all') {
      params.set('ptype_id', ptypeIdFilter)
    }
    if (fsIdFilter !== 'all') {
      params.set('fs_id', fsIdFilter)
    }
    if (statusFilter !== 'all') {
      params.set('status', statusFilter)
    }
    if (deptIdFilter !== 'all') {
      params.set('dept_id', deptIdFilter)
    }
    // Only use state values for dates - don't preserve from URL to allow clearing
    if (fromDate) {
      params.set('from_date', fromDate)
    }
    if (toDate) {
      params.set('to_date', toDate)
    }
    
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    const currentUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname
    
    // Only update URL if it's different to avoid infinite loops
    if (newUrl !== currentUrl) {
      router.replace(newUrl, { scroll: false })
    }
  }, [ptypeIdFilter, fsIdFilter, statusFilter, deptIdFilter, fromDate, toDate, pathname, router, searchParams])

  // Build filters object for server-side filtering
  const businessPlanFilters = useMemo(() => {
    const filters: BusinessPlanFilters = { all: true }
    if (ptypeIdFilter !== 'all') {
      filters.ptype_id = parseInt(ptypeIdFilter)
    }
    if (fsIdFilter === 'null') {
      filters.fs_id = null
    } else if (fsIdFilter !== 'all') {
      filters.fs_id = parseInt(fsIdFilter)
    }
    if (statusFilter !== 'all') {
      filters.status = parseInt(statusFilter)
    }
    if (deptIdFilter !== 'all') {
      filters.dept_id = parseInt(deptIdFilter)
    }
    if (fromDate) {
      filters.from_date = fromDate
    }
    if (toDate) {
      filters.to_date = toDate
    }
    return filters
  }, [ptypeIdFilter, fsIdFilter, statusFilter, deptIdFilter, fromDate, toDate])

  const { businessPlans, loading, error } = useBusinessPlans(businessPlanFilters)
  const { projectTypes } = useProjectTypes({ all: true })
  const { fundingSources } = useFundingSources({ all: true })
  
  // Fetch business plan details for selected business plan with server-side sorting
  const { businessPlanDetails: allBusinessPlanDetails, loading: businessPlanDetailsLoading } = useBusinessPlanDetails({ 
    proj_id: selectedBusinessPlan?.id, 
    all: true,
    sort_by: 'order',
    sort_order: 'asc'
  })
  
  // Sort business plan details by order
  const businessPlanDetails = useMemo(() => {
    return [...allBusinessPlanDetails].sort((a, b) => (a.order || 0) - (b.order || 0))
  }, [allBusinessPlanDetails])

  // Fetch all delays for the selected business plan details
  const allBpdIds = useMemo(() => businessPlanDetails.map(d => d.bpd_id), [businessPlanDetails])
  
  // Fetch delays for all details (we'll group them by bpd_id)
  const { bpdDelays: allBPDDelays } = useBPDDelays({ 
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
    } catch (err) {
      console.error('Failed to fetch PTS details:', err)
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
      } catch (err) {
        console.error('Failed to load business plan step prerequisites:', err)
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
  
  // Helper for filter display (when we only have an ID)
  const getFundingSourceNameById = (fsId: number | null | undefined) => {
    if (!fsId) return 'N/A'
    const fundingSource = fundingSources.find(fs => fs.id === fsId)
    return fundingSource?.name || 'N/A'
  }

  const getDepartmentNameById = (deptId: number | null | undefined) => {
    if (!deptId) return 'N/A'
    const dept = departments.find(d => d.dept_id === deptId)
    return dept?.name || 'N/A'
  }

  const getStatusDisplay = (status: number) => {
    switch (status) {
      case 0: return 'Planned'
      case 1: return 'In Progress'
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

  // Calculate cost totals
  const costSummary = useMemo(() => {
    const totalEstimated = businessPlanDetails.reduce((sum, detail) => sum + (detail.est_cost || 0), 0)
    const totalActual = businessPlanDetails.reduce((sum, detail) => sum + (detail.act_cost || 0), 0)
    const variance = totalActual - totalEstimated
    const variancePercentage = totalEstimated > 0 ? Math.round((variance / totalEstimated) * 100) : 0
    
    return {
      totalEstimated,
      totalActual,
      variance,
      variancePercentage
    }
  }, [businessPlanDetails])

  // Calculate days totals
  const daysSummary = useMemo(() => {
    // Use server-side total_days when available, otherwise calculate from details as fallback
    const totalTargetDays = selectedBusinessPlan?.total_days !== null && selectedBusinessPlan?.total_days !== undefined
      ? selectedBusinessPlan.total_days
      : businessPlanDetails.reduce((sum, detail) => sum + (detail.t_days || 0), 0)
    
    // Calculate actual days for each step
    let totalActualDays = 0
    const now = new Date()
    
    businessPlanDetails.forEach(detail => {
      if (detail.started_at) {
        const startDate = new Date(detail.started_at)
        let endDate: Date
        
        if (detail.completed_at) {
          // If completed, use completed date
          endDate = new Date(detail.completed_at)
        } else if (detail.status === 1) {
          // If started but not completed, use current date
          endDate = now
        } else {
          // If not started, don't count
          return
        }
        
        // Calculate difference in days
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        totalActualDays += diffDays
      }
    })
    
    const variance = totalActualDays - totalTargetDays
    const variancePercentage = totalTargetDays > 0 ? Math.round((variance / totalTargetDays) * 100) : 0
    
    return {
      totalTargetDays,
      totalActualDays,
      variance,
      variancePercentage
    }
  }, [businessPlanDetails, selectedBusinessPlan?.total_days])


  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortBusinessPlans = useCallback((businessPlans: BusinessPlan[], field: string, direction: 'asc' | 'desc') => {
    return [...businessPlans].sort((a, b) => {
      let aValue: any, bValue: any
      switch (field) {
        case 'name':
          aValue = a.name?.toLowerCase() || ''
          bValue = b.name?.toLowerCase() || ''
          break
        case 'project_type':
          aValue = getProjectTypeName(a.ptype_id).toLowerCase()
          bValue = getProjectTypeName(b.ptype_id).toLowerCase()
          break
        case 'department':
          aValue = getDepartmentName(a).toLowerCase()
          bValue = getDepartmentName(b).toLowerCase()
          break
        case 'start_date':
          aValue = a.start_date ? new Date(a.start_date).getTime() : 0
          bValue = b.start_date ? new Date(b.start_date).getTime() : 0
          break
        case 'completion_date':
          aValue = a.completion_date ? new Date(a.completion_date).getTime() : 0
          bValue = b.completion_date ? new Date(b.completion_date).getTime() : 0
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
    // Server-side filters (ptype_id, dept_id, fs_id, status) are already applied via API
    // Only apply client-side filters (search term and advanced filters)
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
    if (sortField) {
      filtered = sortBusinessPlans(filtered, sortField, sortDirection)
    }
    return filtered
  }, [businessPlans, searchTerm, filterModel, sortField, sortDirection, sortBusinessPlans])

  // Calculate current financial year dates for comparison
  // Check if dates are in URL params or if they differ from defaults
  const urlFromDate = searchParams.get('from_date')
  const urlToDate = searchParams.get('to_date')
  const hasFromDate = (fromDate && fromDate.trim() !== '') || (urlFromDate !== null && urlFromDate !== '')
  const hasToDate = (toDate && toDate.trim() !== '') || (urlToDate !== null && urlToDate !== '')
  
  const hasActiveFilters = useMemo(() => {
    return filterModel.items.length > 0 || 
           searchTerm || 
           ptypeIdFilter !== 'all' || 
           fsIdFilter !== 'all' || 
           statusFilter !== 'all' || 
           deptIdFilter !== 'all' ||
           hasFromDate || 
           hasToDate
  }, [filterModel.items.length, searchTerm, ptypeIdFilter, fsIdFilter, statusFilter, deptIdFilter, hasFromDate, hasToDate])
  
  // Show Clear All when any filters are active
  const shouldShowClearAll = hasActiveFilters

  const getProjectValueInput = (field: FilterField, operator: string, value: any, onChange: (value: any) => void) => {
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
    // Set flag to prevent URL sync effect from interfering
    isUpdatingFromUrl.current = true
    
    setFilterModel({ items: [], logicOperator: 'and' })
    setSearchTerm('')
    setPtypeIdFilter('all')
    setFsIdFilter('all')
    setStatusFilter('all')
    setDeptIdFilter('all')
    setFromDate('')
    setToDate('')
    datesInitialized.current = true // Prevent useEffect from resetting dates
    
    // Clear URL params directly
    router.replace(pathname, { scroll: false })
    
    // Reset flag after a delay to allow URL update effect to run
    setTimeout(() => {
      isUpdatingFromUrl.current = false
    }, 100)
  }

  return (
    <div className="relative -mx-6 px-6 space-y-6 pb-6">
      {/* Top Section - Filters */}
      <Card className="flex-shrink-0">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* First Row - 3 filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromDate">From Date</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="toDate">To Date</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Second Row - 3 filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="0">Planned</SelectItem>
                    <SelectItem value="1">In Progress</SelectItem>
                    <SelectItem value="2">Completed</SelectItem>
                    <SelectItem value="3">Cancelled</SelectItem>
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

            {/* <div className="flex gap-4">
              <Button variant="outline" onClick={() => setIsFilterDialogOpen(true)}>
                <Filter className="mr-2 h-4 w-4" />
                Advanced Filters
              </Button>
            </div> */}

            {hasActiveFilters && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Active Filters</span>
                  {shouldShowClearAll && (
                    <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-6 px-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                      Clear All
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {ptypeIdFilter !== 'all' && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                      <Filter className="h-3 w-3" />
                      <span>Project Type: {getProjectTypeName(Number(ptypeIdFilter))}</span>
                      <button onClick={() => setPtypeIdFilter('all')} className="ml-1 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {fsIdFilter !== 'all' && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                      <Filter className="h-3 w-3" />
                      <span>Funding Source: {fsIdFilter === 'null' ? 'No Funding Source' : getFundingSourceNameById(Number(fsIdFilter))}</span>
                      <button onClick={() => setFsIdFilter('all')} className="ml-1 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {statusFilter !== 'all' && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                      <Filter className="h-3 w-3" />
                      <span>Status: {statusFilter === '0' ? 'Planned' : statusFilter === '1' ? 'In Progress' : statusFilter === '2' ? 'Completed' : 'Cancelled'}</span>
                      <button onClick={() => setStatusFilter('all')} className="ml-1 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {deptIdFilter !== 'all' && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                      <Filter className="h-3 w-3" />
                      <span>Department: {getDepartmentNameById(Number(deptIdFilter))}</span>
                      <button onClick={() => setDeptIdFilter('all')} className="ml-1 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {fromDate && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                      <Calendar className="h-3 w-3" />
                      <span>From: {formatDate(fromDate)}</span>
                      <button onClick={() => setFromDate('')} className="ml-1 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {toDate && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                      <Calendar className="h-3 w-3" />
                      <span>To: {formatDate(toDate)}</span>
                      <button onClick={() => setToDate('')} className="ml-1 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
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
        </CardContent>
      </Card>

      <div className="flex gap-6 w-full min-w-[1000px] items-start">
        {/* Left Sidebar - Projects List */}
        <div className="w-70 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-800 sticky top-0 h-[calc(100vh-7rem)]">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">View projects details, progress, and status</p>
              </div>
            </div>
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
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading projects...</p>
              </div>
            ) : filteredBusinessPlans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No projects found</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{hasActiveFilters ? 'Try adjusting your filters' : 'No projects available'}</p>
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
        <div className="flex-1 min-w-0 w-full">
          {selectedBusinessPlan ? (
            <div className="space-y-6 w-full">
              {/* Master Info - Inline, non-table layout */}
              <div className="rounded-md border border-gray-200 dark:border-gray-800 bg-transparent shadow-none p-4 w-full">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Project</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedBusinessPlan.name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-48">
                      <Hash className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">ID</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedBusinessPlan.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-48">
                      <Briefcase className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Project Type</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{getProjectTypeName(selectedBusinessPlan.ptype_id)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-48">
                      <Building2 className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Department</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{getDepartmentName(selectedBusinessPlan)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-48">
                      <Wallet className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Funding Source</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{getFundingSourceName(selectedBusinessPlan)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-48">
                      <Calendar className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Created</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{formatDate(selectedBusinessPlan.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-48">
                      <Calendar className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Start Date</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedBusinessPlan.start_date ? formatDate(selectedBusinessPlan.start_date) : 'N/A'}</span>
                  </div>
                  {selectedBusinessPlan.total_days !== null && selectedBusinessPlan.total_days !== undefined && selectedBusinessPlan.status !== 2 && selectedBusinessPlan.status !== 3 && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 w-48">
                        <Clock className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                        <span className="text-gray-500 dark:text-gray-400">Est. Duration</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedBusinessPlan.total_days} day{selectedBusinessPlan.total_days !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  {selectedBusinessPlan.start_date && selectedBusinessPlan.est_completion_date && selectedBusinessPlan.status !== 2 && selectedBusinessPlan.status !== 3 && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 w-48">
                        <Calendar className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                        <span className="text-gray-500 dark:text-gray-400">Est. Completion</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{formatDate(selectedBusinessPlan.est_completion_date)}</span>
                    </div>
                  )}
                  {selectedBusinessPlan.start_date && selectedBusinessPlan.new_est_completion_date && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 w-48">
                        <Calendar className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                        <span className="text-gray-500 dark:text-gray-400">New Est. Completion</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{formatDate(selectedBusinessPlan.new_est_completion_date)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-48">
                      <Target className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Target Date</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedBusinessPlan.tar_date ? formatDate(selectedBusinessPlan.tar_date) : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-48">
                      <CheckCircle2 className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Actual Completion Date</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedBusinessPlan.completion_date ? formatDate(selectedBusinessPlan.completion_date) : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-48">
                      <Tag className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Status</span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(selectedBusinessPlan.status)}`}>
                      {getStatusDisplay(selectedBusinessPlan.status)}
                    </span>
                  </div>
                  {selectedBusinessPlan.status === 3 && selectedBusinessPlan.cancellation_date && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 w-48">
                          <Calendar className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                          <span className="text-gray-500 dark:text-gray-400">Cancellation Date</span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatDate(selectedBusinessPlan.cancellation_date)}
                        </span>
                      </div>
                      {selectedBusinessPlan.cancellation_reason && (
                        <div className="flex items-start gap-2">
                          <div className="flex items-center gap-1.5 w-48 flex-shrink-0">
                            <AlertCircle className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                            <span className="text-gray-500 dark:text-gray-400">Cancellation Reason</span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white break-words whitespace-normal flex-1 min-w-0">
                            {selectedBusinessPlan.cancellation_reason}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-48">
                      <DollarSign className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Est. Cost (Budget)</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {CURRENCY_SYMBOL} {costSummary.totalEstimated.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-48">
                      <DollarSign className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Actual Cost</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {CURRENCY_SYMBOL} {costSummary.totalActual.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-48">
                      <Layers className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Total Steps</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{businessPlanDetails.length}</span>
                  </div>
                  
                </div>
              </div>

              {/* Detail Table - Business Plan Details */}
              <Card className="w-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Execution Steps</CardTitle>
                      <CardDescription>Steps and progress for this project</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {businessPlanDetailsLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin mb-2 text-gray-400 dark:text-gray-500" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading project details...</p>
                    </div>
                  ) : businessPlanDetails.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">No steps defined</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">No steps have been configured for this project</p>
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

                            {/* Cost Comparison Section */}
                            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                Cost Analysis
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Estimated Cost */}
                                <div className="space-y-2">
                                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Estimated Cost
                                  </div>
                                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {CURRENCY_SYMBOL} {costSummary.totalEstimated.toLocaleString()}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    Total budget allocated
                                  </div>
                                </div>

                                {/* Actual Cost */}
                                <div className="space-y-2">
                                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Actual Cost
                                  </div>
                                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {CURRENCY_SYMBOL} {costSummary.totalActual.toLocaleString()}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    Total spent so far
                                  </div>
                                </div>

                                {/* Variance */}
                                <div className="space-y-2">
                                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Variance
                                  </div>
                                  <div className={`text-2xl font-bold ${
                                    costSummary.variance === 0
                                      ? 'text-gray-700 dark:text-gray-300'
                                      : costSummary.variance > 0
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-green-600 dark:text-green-400'
                                  }`}>
                                    {costSummary.variance >= 0 ? '+' : ''}{CURRENCY_SYMBOL} {Math.abs(costSummary.variance).toLocaleString()}
                                  </div>
                                  <div className={`text-xs font-medium ${
                                    costSummary.variance === 0
                                      ? 'text-gray-600 dark:text-gray-400'
                                      : costSummary.variance > 0
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-green-600 dark:text-green-400'
                                  }`}>
                                    {costSummary.variance === 0 
                                      ? 'On budget' 
                                      : costSummary.variance > 0 
                                      ? `Over budget by ${Math.abs(costSummary.variancePercentage)}%`
                                      : `Under budget by ${Math.abs(costSummary.variancePercentage)}%`
                                    }
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Days Comparison Section */}
                            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Timeline Analysis
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Target Days */}
                                <div className="space-y-2">
                                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Target Days
                                  </div>
                                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {daysSummary.totalTargetDays} day{daysSummary.totalTargetDays !== 1 ? 's' : ''}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    Total planned duration
                                  </div>
                                </div>

                                {/* Actual Days */}
                                <div className="space-y-2">
                                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Actual Days
                                  </div>
                                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {daysSummary.totalActualDays} day{daysSummary.totalActualDays !== 1 ? 's' : ''}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    Total elapsed time
                                  </div>
                                </div>

                                {/* Variance */}
                                <div className="space-y-2">
                                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Variance
                                  </div>
                                  <div className={`text-2xl font-bold ${
                                    daysSummary.variance === 0
                                      ? 'text-gray-700 dark:text-gray-300'
                                      : daysSummary.variance > 0
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-green-600 dark:text-green-400'
                                  }`}>
                                    {daysSummary.variance >= 0 ? '+' : ''}{Math.abs(daysSummary.variance)} day{Math.abs(daysSummary.variance) !== 1 ? 's' : ''}
                                  </div>
                                  <div className={`text-xs font-medium ${
                                    daysSummary.variance === 0
                                      ? 'text-gray-600 dark:text-gray-400'
                                      : daysSummary.variance > 0
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-green-600 dark:text-green-400'
                                  }`}>
                                    {daysSummary.variance === 0 
                                      ? 'On schedule' 
                                      : daysSummary.variance > 0 
                                      ? `Over schedule by ${Math.abs(daysSummary.variancePercentage)}%`
                                      : `Ahead of schedule by ${Math.abs(daysSummary.variancePercentage)}%`
                                    }
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Detail Cards */}
                      <div className="relative">
                        {businessPlanDetails.map((detail, index) => {
                        const delays = delaysByBpdId[detail.bpd_id] || []
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
        fields={projectFilterFields}
        getOperatorsForField={getProjectOperatorsForField}
        getValueInput={getProjectValueInput}
      />
    </div>
  )
}
