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
import { Search, Loader2, Filter, X, Play, ChevronDown, Hash, Folder, Building2, Wallet, Calendar, Clock, ListOrdered, DollarSign, CheckCircle2, Target, AlertCircle } from 'lucide-react'
import { AdvancedFilterDialog, FilterField, FilterOperator } from '@/components/ui/advanced-filter-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

export function ProjectInitiationPage() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterModel, setFilterModel] = useState({
    items: [] as Array<{ id: number; field: string; operator: string; value: any }>,
    logicOperator: 'and' as 'and' | 'or'
  })
  const [selectedBusinessPlan, setSelectedBusinessPlan] = useState<BusinessPlan | null>(null)
  const [initiatingId, setInitiatingId] = useState<number | null>(null)

  // Initiation confirmation dialog
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [planToInitiate, setPlanToInitiate] = useState<BusinessPlan | null>(null)
  const [startDate, setStartDate] = useState<string>('')
  const [startDateError, setStartDateError] = useState<string>('')

  const { access } = useUserAccess()
  // Project Initiation page uses business-plan-start slug
  const hasShowPermission = access?.aggregatedPermissions?.[getSlugForName('Project Initiation')]?.show === true
  const hasStartPermission = access?.aggregatedPermissions?.[getSlugForName('Project Initiation')]?.edit === true

  const { businessPlans, loading, error, startBusinessPlan, updateBusinessPlan } = useBusinessPlans({ all: true, status: 0 })
  
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

  // Calculate total estimated cost from all steps
  const estimatedCost = useMemo(() => {
    return businessPlanDetails.reduce((total, detail) => total + (detail.est_cost || 0), 0)
  }, [businessPlanDetails])

  // Helper functions to get names from API response
  const getProjectTypeName = (businessPlan: BusinessPlan) => {
    return businessPlan.project_type?.name || 'N/A'
  }

  const getDepartmentName = (businessPlan: BusinessPlan) => {
    return businessPlan.department_name || businessPlan.department?.name || 'N/A'
  }

  const getFundingSourceName = (businessPlan: BusinessPlan) => {
    if (!businessPlan.fs_id) return 'N/A'
    return businessPlan.funding_source_name || 'N/A'
  }

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
        setExpandedBpDetailRows(new Set())
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

  const getBusinessPlanFieldValue = (businessPlan: BusinessPlan, field: string) => {
    switch (field) {
      case 'name': return businessPlan.name || ''
      case 'project_type': return getProjectTypeName(businessPlan)
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
        getProjectTypeName(businessPlan).toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const handleInitiateProject = (businessPlan: BusinessPlan) => {
    if (!hasStartPermission) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'You do not have permission to start projects',
      })
      return
    }
    setPlanToInitiate(businessPlan)
    // Set default start date to today
    const today = new Date().toISOString().split('T')[0]
    setStartDate(today)
    setStartDateError('')
    setIsConfirmOpen(true)
  }

  const handleConfirmInitiate = async () => {
    if (!planToInitiate) return
    
    // Validate start date
    if (!startDate || !startDate.trim()) {
      setStartDateError('Start date is required')
      return
    }
    
    try {
      setInitiatingId(planToInitiate.id)
      // Use the start action endpoint with the provided start_date
      await startBusinessPlan(planToInitiate.id, startDate)
      
      // Clear selected business plan since initiated projects (status 1) are filtered out of the list (status 0)
      if (selectedBusinessPlan?.id === planToInitiate.id) {
        setSelectedBusinessPlan(null)
      }
      setIsConfirmOpen(false)
      setPlanToInitiate(null)
      setStartDate('')
      setStartDateError('')
    } catch (error) {
      console.error('Failed to initiate project:', error)
      toast({
        variant: 'destructive',
        title: 'Initiation Failed',
        description: 'Failed to initiate project. Please try again.',
      })
    } finally {
      setInitiatingId(null)
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Initiation</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Select a planned project to initiate</p>
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
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No planned projects found</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{hasActiveFilters ? 'Try adjusting your filters' : 'All projects have been initiated or there are no planned projects'}</p>
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
                          ID: {businessPlan.id} • {getProjectTypeName(businessPlan)} • {getDepartmentName(businessPlan)}
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
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Business Plan</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedBusinessPlan.name}</p>
                  </div>
                  {hasStartPermission && (
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => handleInitiateProject(selectedBusinessPlan)} 
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={initiatingId === selectedBusinessPlan.id}
                    >
                      {initiatingId === selectedBusinessPlan.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Initiating...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Initiate Project
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-gray-500 dark:text-gray-400 w-24">ID</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedBusinessPlan.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-gray-500 dark:text-gray-400 w-24">Project Type</span>
                    <span className="font-medium text-gray-900 dark:text-white">{getProjectTypeName(selectedBusinessPlan)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-gray-500 dark:text-gray-400 w-24">Department</span>
                    <span className="font-medium text-gray-900 dark:text-white">{getDepartmentName(selectedBusinessPlan)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-gray-500 dark:text-gray-400 w-24">Funding Source</span>
                    <span className="font-medium text-gray-900 dark:text-white">{getFundingSourceName(selectedBusinessPlan)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-gray-500 dark:text-gray-400 w-24">Start Date</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedBusinessPlan.start_date ? formatDate(selectedBusinessPlan.start_date) : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-gray-500 dark:text-gray-400 w-24">Completion Date</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedBusinessPlan.completion_date ? formatDate(selectedBusinessPlan.completion_date) : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-gray-500 dark:text-gray-400 w-24">Target Date</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedBusinessPlan.tar_date ? formatDate(selectedBusinessPlan.tar_date) : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-gray-500 dark:text-gray-400 w-24">Created</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatDate(selectedBusinessPlan.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-gray-500 dark:text-gray-400 w-24">Est. Cost (Budget)</span>
                    <span className="font-medium text-gray-900 dark:text-white">{CURRENCY_SYMBOL} {estimatedCost.toLocaleString()}</span>
                  </div>
                  {selectedBusinessPlan.total_days !== null && selectedBusinessPlan.total_days !== undefined && selectedBusinessPlan.status !== 2 && selectedBusinessPlan.status !== 3 && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                      <span className="text-gray-500 dark:text-gray-400 w-24">Est. Duration</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedBusinessPlan.total_days} day{selectedBusinessPlan.total_days !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  {selectedBusinessPlan.start_date && selectedBusinessPlan.est_completion_date && selectedBusinessPlan.status !== 2 && selectedBusinessPlan.status !== 3 && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                      <span className="text-gray-500 dark:text-gray-400 w-24">Est. Completion</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatDate(selectedBusinessPlan.est_completion_date)}</span>
                    </div>
                  )}
                  {selectedBusinessPlan.start_date && selectedBusinessPlan.new_est_completion_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                      <span className="text-gray-500 dark:text-gray-400 w-24">New Est. Completion</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatDate(selectedBusinessPlan.new_est_completion_date)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <ListOrdered className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-gray-500 dark:text-gray-400 w-24">Total Steps</span>
                    <span className="font-medium text-gray-900 dark:text-white">{businessPlanDetails.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-gray-500 dark:text-gray-400 w-24">Status</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(selectedBusinessPlan.status)}`}>
                      {getStatusDisplay(selectedBusinessPlan.status)}
                    </span>
                  </div>
                  {selectedBusinessPlan.status === 3 && selectedBusinessPlan.cancellation_date && (
                    <>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
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
                      <CardTitle>Execution Steps</CardTitle>
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
                    <Table>
                      <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[250px]">Step</TableHead>
                            <TableHead>Order</TableHead>
                            <TableHead>Weightage</TableHead>
                            <TableHead>Target Time</TableHead>
                            <TableHead>Est. Cost (Budget)</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Starting Remarks</TableHead>
                            <TableHead>Completion Remarks</TableHead>
                            <TableHead>Started At</TableHead>
                            <TableHead>Completed At</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {businessPlanDetails.map((detail) => {
                            const prerequisites = bpDetailPtsByBpdId.get(detail.bpd_id) || []
                            const isExpanded = expandedBpDetailRows.has(detail.bpd_id)

                            return (
                              <Fragment key={detail.bpd_id}>
                                <TableRow>
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setExpandedBpDetailRows(prev => {
                                            const next = new Set(prev)
                                            if (next.has(detail.bpd_id)) next.delete(detail.bpd_id)
                                            else next.add(detail.bpd_id)
                                            return next
                                          })
                                        }}
                                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                                        title={isExpanded ? 'Hide prerequisites' : 'Show prerequisites'}
                                      >
                                        <ChevronDown className={cn('h-4 w-4 text-gray-500 transition-transform', isExpanded ? 'rotate-180' : '')} />
                                      </button>
                                      <span>{detail.step?.name || 'N/A'}</span>
                                      {prerequisites.length > 0 && (
                                        <span className="text-xs text-gray-500">
                                          ({prerequisites.length} prerequisite{prerequisites.length !== 1 ? 's' : ''})
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>{detail.order || 0}</TableCell>
                                  <TableCell>{detail.weightage}%</TableCell>
                                  <TableCell>{detail.t_days} day(s)</TableCell>
                                  <TableCell>{CURRENCY_SYMBOL} {detail.est_cost.toLocaleString()}</TableCell>
                                  <TableCell>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(detail.status)}`}>
                                      {getStatusDisplay(detail.status)}
                                    </span>
                                  </TableCell>
                                  <TableCell>{detail.remarks_1 || 'N/A'}</TableCell>
                                  <TableCell>{detail.remarks_2 || 'N/A'}</TableCell>
                                  <TableCell>{detail.started_at ? formatDate(detail.started_at) : 'N/A'}</TableCell>
                                  <TableCell>{detail.completed_at ? formatDate(detail.completed_at) : 'N/A'}</TableCell>
                                </TableRow>

                                {isExpanded && (
                                  <TableRow key={`${detail.bpd_id}-pts`}>
                                    <TableCell colSpan={10} className="bg-gray-50 dark:bg-gray-900/50">
                                      <div className="py-3 px-2 space-y-2">
                                        <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                          Required Steps (Prerequisites)
                                        </div>

                                        {prerequisites.length === 0 ? (
                                          <div className="text-sm text-gray-500 dark:text-gray-400">
                                            No prerequisites.
                                          </div>
                                        ) : (
                                          <div className="space-y-1">
                                            {prerequisites.map((pts) => (
                                              <div key={pts.ptsd_id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400" />
                                                <span>{pts.step?.name || 'N/A'}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
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
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select a business plan</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Choose a planned business plan from the list to view its details</p>
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

      {/* Initiation Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={(open) => {
        // Prevent closing during action
        if (!open && initiatingId !== null) return
        setIsConfirmOpen(open)
      }}>
        <DialogContent 
          onPointerDownOutside={(e) => {
            // Prevent closing by clicking outside during action
            if (initiatingId !== null) {
              e.preventDefault()
            }
          }} 
          onEscapeKeyDown={(e) => {
            // Prevent closing with Escape key during action
            if (initiatingId !== null) {
              e.preventDefault()
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Initiate Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to initiate <strong>{planToInitiate?.name}</strong>? This will change the status to Started.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date <span className="text-red-500">*</span></Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (startDateError) {
                    setStartDateError('')
                  }
                }}
                className={startDateError ? 'border-red-500' : ''}
                required
                disabled={initiatingId !== null}
              />
              {startDateError && (
                <p className="text-sm text-red-500">{startDateError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsConfirmOpen(false)
                setPlanToInitiate(null)
                setStartDate('')
                setStartDateError('')
              }}
              disabled={initiatingId !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmInitiate}
              disabled={initiatingId !== null}
            >
              {initiatingId !== null ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initiating...
                </>
              ) : (
                'Initiate Project'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
