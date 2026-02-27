'use client'

import { useState, useMemo, useCallback, useEffect, Fragment } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useBusinessPlans } from '@/hooks/use-business-plans'
import { useBusinessPlanDetails } from '@/hooks/use-business-plan-details'
import { formatDate, CURRENCY_SYMBOL, cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import { BusinessPlan, PTSDetail } from '@/types'
import { Search, Loader2, Filter, X, XOctagon, ChevronDown, Hash, Folder, Building2, Wallet, Calendar, Clock, ListOrdered, DollarSign, CheckCircle2, Target } from 'lucide-react'
import { AdvancedFilterDialog, FilterField, FilterOperator } from '@/components/ui/advanced-filter-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
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

export function ProjectCancellationPage() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterModel, setFilterModel] = useState({
    items: [] as Array<{ id: number; field: string; operator: string; value: any }>,
    logicOperator: 'and' as 'and' | 'or'
  })
  const [selectedBusinessPlan, setSelectedBusinessPlan] = useState<BusinessPlan | null>(null)
  const [cancellingId, setCancellingId] = useState<number | null>(null)

  // Cancellation confirmation dialog
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [planToCancel, setPlanToCancel] = useState<BusinessPlan | null>(null)
  const [cancellationDate, setCancellationDate] = useState<string>('')
  const [cancellationReason, setCancellationReason] = useState<string>('')
  const [cancellationDateError, setCancellationDateError] = useState<string>('')
  const [cancellationReasonError, setCancellationReasonError] = useState<string>('')

  const { access } = useUserAccess()
  // Project Cancellation page uses business-plan-cancel slug
  const hasShowPermission = access?.aggregatedPermissions?.[getSlugForName('Project Cancellation')]?.show === true
  const hasCancelPermission = access?.aggregatedPermissions?.[getSlugForName('Project Cancellation')]?.edit === true

  const { businessPlans, loading, error, cancelBusinessPlan } = useBusinessPlans({ all: true, status: 1 })
  
  // Fetch business plan details for selected business plan
  const { businessPlanDetails: allBusinessPlanDetails, loading: businessPlanDetailsLoading, refetch: refetchBusinessPlanDetails } = useBusinessPlanDetails({ proj_id: selectedBusinessPlan?.id, all: true })

  // PTS prerequisites for Business Plan detail section (read-only view)
  const [bpDetailPtsByBpdId, setBpDetailPtsByBpdId] = useState<Map<number, PTSDetail[]>>(new Map())
  const [expandedBpDetailRows, setExpandedBpDetailRows] = useState<Set<number>>(new Set())

  // Sort business plan details by order
  const businessPlanDetails = useMemo(() => {
    return [...allBusinessPlanDetails].sort((a, b) => (a.order || 0) - (b.order || 0))
  }, [allBusinessPlanDetails])

  // Use server-side total_days from API instead of calculating client-side
  // const totalDays = useMemo(() => {
  //   if (!selectedBusinessPlan?.total_days) return null
  //   return selectedBusinessPlan.total_days
  // }, [selectedBusinessPlan])

  // Fetch PTS details for prerequisites
  const fetchPTSDetails = useCallback(async (ptdId: number, projId?: number): Promise<PTSDetail[]> => {
    try {
      const response = await apiClient.getPTSDetails(ptdId, projId)
      if (response.success && response.data) return response.data as any
      return []
    } catch (error) {
      console.error('Failed to fetch PTS details:', error)
      return []
    }
  }, [])

  // Load prerequisite (PTS) data for Business Plan detail section
  useEffect(() => {
    const loadBusinessPlanDetailPTS = async () => {
      if (!selectedBusinessPlan || businessPlanDetails.length === 0) {
        setBpDetailPtsByBpdId(new Map())
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

  // Filter business plans by search term
  const filteredBusinessPlans = useMemo(() => {
    let filtered = businessPlans

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(bp =>
        bp.name.toLowerCase().includes(searchLower) ||
        bp.id.toString().includes(searchLower)
      )
    }

    // Apply advanced filters
    if (filterModel.items.length > 0) {
      filtered = filtered.filter(bp => {
        return filterModel.items.every((item, index) => {
          const result = evaluateFilter(bp, item)
          if (index === 0) return result
          return filterModel.logicOperator === 'and' ? result : (filterModel.items.slice(0, index).some(prevItem => evaluateFilter(bp, prevItem)) || result)
        })
      })
    }

    return filtered
  }, [businessPlans, searchTerm, filterModel])

  const evaluateFilter = (bp: BusinessPlan, item: { field: string; operator: string; value: any }): boolean => {
    const fieldValue = getFieldValue(bp, item.field)
    const filterValue = item.value

    switch (item.operator) {
      case 'contains':
        return String(fieldValue || '').toLowerCase().includes(String(filterValue || '').toLowerCase())
      case 'doesNotContain':
        return !String(fieldValue || '').toLowerCase().includes(String(filterValue || '').toLowerCase())
      case 'equals':
        return String(fieldValue || '') === String(filterValue || '')
      case 'doesNotEqual':
        return String(fieldValue || '') !== String(filterValue || '')
      case 'startsWith':
        return String(fieldValue || '').toLowerCase().startsWith(String(filterValue || '').toLowerCase())
      case 'endsWith':
        return String(fieldValue || '').toLowerCase().endsWith(String(filterValue || '').toLowerCase())
      case 'is':
        return fieldValue === filterValue
      case 'isNot':
        return fieldValue !== filterValue
      case 'after':
        return new Date(fieldValue as string) > new Date(filterValue)
      case 'onOrAfter':
        return new Date(fieldValue as string) >= new Date(filterValue)
      case 'before':
        return new Date(fieldValue as string) < new Date(filterValue)
      case 'onOrBefore':
        return new Date(fieldValue as string) <= new Date(filterValue)
      case 'isEmpty':
        return !fieldValue || String(fieldValue).trim() === ''
      case 'isNotEmpty':
        return fieldValue && String(fieldValue).trim() !== ''
      default:
        return true
    }
  }

  const getFieldValue = (bp: BusinessPlan, field: string): any => {
    switch (field) {
      case 'name':
        return bp.name
      case 'project_type':
        return bp.project_type?.name || ''
      case 'department':
        return bp.department?.name || bp.department_name || ''
      case 'start_date':
        return bp.start_date
      case 'completion_date':
        return bp.completion_date
      case 'created_at':
        return bp.created_at
      default:
        return ''
    }
  }

  const getOperatorDisplay = (operator: string): string => {
    const operatorMap: Record<string, string> = {
      'contains': 'contains',
      'doesNotContain': 'does not contain',
      'equals': '=',
      'doesNotEqual': '≠',
      'startsWith': 'starts with',
      'endsWith': 'ends with',
      'is': '=',
      'isNot': '≠',
      'after': '>',
      'onOrAfter': '≥',
      'before': '<',
      'onOrBefore': '≤',
      'isEmpty': 'is empty',
      'isNotEmpty': 'is not empty'
    }
    return operatorMap[operator] || operator
  }

  const hasActiveFilters = searchTerm !== '' || filterModel.items.length > 0

  const handleClearFilters = () => {
    setSearchTerm('')
    setFilterModel({ items: [], logicOperator: 'and' })
  }

  const handleCancelProject = (businessPlan: BusinessPlan) => {
    if (!hasCancelPermission) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'You do not have permission to cancel projects',
      })
      return
    }
    setPlanToCancel(businessPlan)
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    setCancellationDate(todayStr)
    setCancellationReason('')
    setCancellationDateError('')
    setCancellationReasonError('')
    setIsConfirmOpen(true)
  }

  const handleConfirmCancel = async () => {
    if (!planToCancel) return
    
    // Validate cancellation date
    if (!cancellationDate || !cancellationDate.trim()) {
      setCancellationDateError('Cancellation date is required')
      return
    }
    setCancellationDateError('')
    
    // Validate cancellation reason
    if (!cancellationReason || !cancellationReason.trim()) {
      setCancellationReasonError('Cancellation reason is required')
      return
    }
    setCancellationReasonError('')
    
    try {
      setCancellingId(planToCancel.id)
      const result = await cancelBusinessPlan(planToCancel.id, cancellationDate, cancellationReason.trim())
      
      if (result) {
        toast({
          title: 'Project Cancelled',
          description: 'The project has been cancelled successfully',
        })
        setIsConfirmOpen(false)
        setPlanToCancel(null)
        setCancellationDate('')
        setCancellationReason('')
        // Clear selected business plan if it was cancelled
        if (selectedBusinessPlan?.id === result.id) {
          setSelectedBusinessPlan(null)
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Cancellation Failed',
          description: 'Failed to cancel the project. Please try again.',
        })
      }
    } catch (error) {
      console.error('Failed to cancel project:', error)
      toast({
        variant: 'destructive',
        title: 'Cancellation Failed',
        description: 'Failed to cancel the project. Please try again.',
      })
    } finally {
      setCancellingId(null)
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Cancellation</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Select a started project to cancel</p>
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
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{hasActiveFilters ? 'Try adjusting your filters' : 'All projects have been cancelled or there are no started projects'}</p>
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
                          ID: {businessPlan.id} • {businessPlan.project_type?.name || 'N/A'} • {businessPlan.department?.name || businessPlan.department_name || 'N/A'}
                        </div>
                        {businessPlan.start_date && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Started: {formatDate(businessPlan.start_date)}
                          </div>
                        )}
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
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Business Plan</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedBusinessPlan.name}</p>
                  </div>
                  {hasCancelPermission && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleCancelProject(selectedBusinessPlan)} 
                      className="bg-red-600 hover:bg-red-700 text-white"
                      disabled={cancellingId === selectedBusinessPlan.id}
                    >
                      {cancellingId === selectedBusinessPlan.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        <>
                          <XOctagon className="mr-2 h-4 w-4" />
                          Cancel Project
                        </>
                      )}
                    </Button>
                  )}
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
                      <Folder className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Project Type</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedBusinessPlan.project_type?.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-48">
                      <Building2 className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Department</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedBusinessPlan.department?.name || selectedBusinessPlan.department_name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-48">
                      <Wallet className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Funding Source</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedBusinessPlan.funding_source_name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-48">
                      <Calendar className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Start Date</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedBusinessPlan.start_date ? formatDate(selectedBusinessPlan.start_date) : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-48">
                      <Target className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Target Date</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedBusinessPlan.tar_date ? formatDate(selectedBusinessPlan.tar_date) : 'N/A'}</span>
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
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-gray-500" />
                      <span className="ml-2 text-gray-600 dark:text-gray-400">Loading steps...</span>
                    </div>
                  ) : businessPlanDetails.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 dark:text-gray-400">No steps found for this project</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Step</TableHead>
                          <TableHead>Weightage</TableHead>
                          <TableHead>Target Days</TableHead>
                          <TableHead>Est. Cost</TableHead>
                          <TableHead className="min-w-[120px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {businessPlanDetails.map((detail) => {
                          const ptsDetails = bpDetailPtsByBpdId.get(detail.bpd_id) || []
                          const isExpanded = expandedBpDetailRows.has(detail.bpd_id)
                          
                          return (
                            <Fragment key={detail.bpd_id}>
                              <TableRow>
                                <TableCell>
                                  {ptsDetails.length > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setExpandedBpDetailRows(prev => {
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
                                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronDown className="h-4 w-4 rotate-[-90deg]" />}
                                    </Button>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">{getStepName(detail.s_id)}</TableCell>
                                <TableCell>{detail.weightage || 0}%</TableCell>
                                <TableCell>{detail.t_days || 0} days</TableCell>
                                <TableCell>{CURRENCY_SYMBOL} {detail.est_cost?.toLocaleString() || '0'}</TableCell>
                                <TableCell className="min-w-[120px]">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    detail.status === 0 ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' :
                                    detail.status === 1 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                  }`}>
                                    {detail.status === 0 ? 'Planned' : detail.status === 1 ? 'In Progress' : 'Completed'}
                                  </span>
                                </TableCell>
                              </TableRow>
                              {isExpanded && ptsDetails.length > 0 && (
                                <TableRow>
                                  <TableCell colSpan={6} className="bg-gray-50 dark:bg-gray-900/50">
                                    <div className="p-4">
                                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prerequisites:</p>
                                      <div className="space-y-2">
                                        {ptsDetails.map((pts) => (
                                          <div key={pts.ptsd_id} className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                                            <span className="text-sm text-gray-900 dark:text-white">{getStepName(pts.step_id)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </Fragment>
                          )
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <Folder className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">No project selected</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Select a project from the list to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Cancellation Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancellation-date">Cancellation Date *</Label>
              <Input
                id="cancellation-date"
                type="date"
                value={cancellationDate}
                onChange={(e) => {
                  setCancellationDate(e.target.value)
                  setCancellationDateError('')
                }}
                className={cancellationDateError ? 'border-red-500' : ''}
              />
              {cancellationDateError && (
                <p className="text-sm text-red-600 dark:text-red-400">{cancellationDateError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cancellation-reason">Cancellation Reason *</Label>
              <Textarea
                id="cancellation-reason"
                value={cancellationReason}
                onChange={(e) => {
                  setCancellationReason(e.target.value)
                  setCancellationReasonError('')
                }}
                placeholder="Enter the reason for cancelling this project..."
                className={cancellationReasonError ? 'border-red-500' : ''}
                rows={4}
              />
              {cancellationReasonError && (
                <p className="text-sm text-red-600 dark:text-red-400">{cancellationReasonError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmOpen(false)
                setPlanToCancel(null)
                setCancellationDate('')
                setCancellationReason('')
                setCancellationDateError('')
                setCancellationReasonError('')
              }}
              disabled={cancellingId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={cancellingId !== null}
            >
              {cancellingId !== null ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Confirm Cancellation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
