'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useBusinessPlans } from '@/hooks/use-business-plans'
import { useBusinessPlanDetails } from '@/hooks/use-business-plan-details'
import { useProjectTypes } from '@/hooks/use-project-types'
import { useFundingSources } from '@/hooks/use-funding-sources'
import { useSettings } from '@/hooks/use-settings'
import { useUsersDepartments } from '@/hooks/use-users-departments'
import { useUserAccess } from '@/hooks/use-user-access'
import { formatDate, CURRENCY_SYMBOL, getCurrentFinancialYearDates } from '@/lib/utils'
import { BusinessPlan, BusinessPlanDetail } from '@/types'
import { Loader2, ChevronDown, ChevronUp, DollarSign, Clock, FileText, TrendingUp, TrendingDown, Search, Filter, X, Target, CheckCircle, Calendar, Percent, PlayCircle, ArrowRight, Hash, AlertCircle } from 'lucide-react'
// import { AdvancedFilterDialog, FilterField, FilterOperator } from '@/components/ui/advanced-filter-dialog'
import { FilterField, FilterOperator } from '@/components/ui/advanced-filter-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { BusinessPlanFilters } from '@/types'

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

interface ProjectSummaryCardProps {
  project: BusinessPlan
  isExpanded: boolean
  onToggle: () => void
}

function ProjectSummaryCard({ project, isExpanded, onToggle }: ProjectSummaryCardProps) {
  // Fetch business plan details for this project
  const { businessPlanDetails, loading: detailsLoading } = useBusinessPlanDetails({ 
    proj_id: project.id, 
    all: true,
    sort_by: 'order',
    sort_order: 'asc'
  })

  // Helper functions
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

  // Calculate cost summary
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

  // Calculate days summary
  const daysSummary = useMemo(() => {
    // Use server-side total_days when available, otherwise calculate from details as fallback
    const totalTargetDays = project.total_days !== null && project.total_days !== undefined
      ? project.total_days
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
  }, [businessPlanDetails, project.total_days])

  return (
    <Card className="border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader 
        className="cursor-pointer select-none"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              {project.name}
            </CardTitle>
            <div className="mt-1 space-y-1">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">ID:</span> {project.id}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Project Type:</span> {project.project_type?.name || 'N/A'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Department:</span> {project.department?.name || 'N/A'}
              </div>
              {project.total_days !== null && project.total_days !== undefined && project.status !== 2 && project.status !== 3 && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Duration:</span> {project.total_days} day{project.total_days !== 1 ? 's' : ''}
                </div>
              )}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Status:</span>{' '}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(project.status)}`}>
                  {getStatusDisplay(project.status)}
                </span>
              </div>
              {project.status === 3 && (
                <>
                  {project.cancellation_date && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span className="font-medium">Cancellation Date:</span> {formatDate(project.cancellation_date)}
                    </div>
                  )}
                  {project.cancellation_reason && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span className="font-medium">Cancellation Reason:</span>{' '}
                      <span className="break-words whitespace-normal">{project.cancellation_reason}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      {/* Execution Summary Section - Always Visible */}
      {!detailsLoading && businessPlanDetails.length > 0 && (
        <CardContent className="pt-0">
          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-900/20 dark:to-gray-900/50 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Execution Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Project Duration */}
                {project.total_days !== null && project.total_days !== undefined && project.status !== 2 && project.status !== 3 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      Project Duration
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {project.total_days} day{project.total_days !== 1 ? 's' : ''}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Total project duration
                    </div>
                  </div>
                )}
                {/* Estimated Completion Date */}
                {project.est_completion_date && project.status !== 2 && project.status !== 3 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      Est. Completion
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatDate(project.est_completion_date)}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Estimated completion date
                    </div>
                  </div>
                )}
                {/* New Estimated Completion Date */}
                {project.new_est_completion_date && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      New Est. Completion
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatDate(project.new_est_completion_date)}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Updated estimated completion date
                    </div>
                  </div>
                )}
                {/* Project Status */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Project Status
                  </div>
                  <div className="text-lg font-semibold">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(project.status)}`}>
                      {getStatusDisplay(project.status)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Current project status
                  </div>
                </div>
                {/* Cancellation Info - Only show if cancelled */}
                {project.status === 3 && project.cancellation_date && (
                  <>
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        Cancellation Date
                      </div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatDate(project.cancellation_date)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Date when project was cancelled
                      </div>
                    </div>
                    {project.cancellation_reason && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Cancellation Reason
                        </div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white break-words whitespace-normal">
                          {project.cancellation_reason}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Reason for project cancellation
                        </div>
                      </div>
                    )}
                  </>
                )}
                {/* Completion Percentage */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                    <Percent className="h-3.5 w-3.5" />
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
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                    <PlayCircle className="h-3.5 w-3.5" />
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
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5" />
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
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                    <ArrowRight className="h-3.5 w-3.5" />
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

              {/* Target Date vs Actual Completion Date */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date Analysis
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Target Date */}
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                      <Target className="h-3.5 w-3.5" />
                      Target Completion Date
                    </div>
                    {project.tar_date ? (
                      <div className="flex items-center gap-2">
                        {/* <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-sm">
                          <Target className="h-4 w-4" />
                        </div> */}
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {formatDate(project.tar_date)}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Planned completion
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                        N/A
                      </div>
                    )}
                  </div>

                  {/* Actual Completion Date */}
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Actual Completion Date
                    </div>
                    {project.completion_date ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-bold text-sm">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {formatDate(project.completion_date)}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Actual completion
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                        Not completed
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Status
                    </div>
                    {(() => {
                      if (!project.tar_date) {
                        return (
                          <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                            N/A
                          </div>
                        )
                      }
                      
                      if (!project.completion_date) {
                        const now = new Date()
                        const targetDate = new Date(project.tar_date)
                        const isOverdue = now > targetDate
                        
                        return (
                          <div className="flex items-center gap-2">
                            {/* <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                              isOverdue
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            }`}>
                              {isOverdue ? (
                                <TrendingDown className="h-4 w-4" />
                              ) : (
                                <TrendingUp className="h-4 w-4" />
                              )}
                            </div> */}
                            <div>
                              <div className={`font-semibold ${
                                isOverdue
                                  ? 'text-red-700 dark:text-red-300'
                                  : 'text-green-700 dark:text-green-300'
                              }`}>
                                {isOverdue ? 'Overdue' : 'On Track'}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {isOverdue 
                                  ? `${Math.ceil((now.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))} days overdue`
                                  : `${Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days remaining`
                                }
                              </div>
                            </div>
                          </div>
                        )
                      }
                      
                      // Both dates exist - compare them
                      const targetDate = new Date(project.tar_date)
                      const actualDate = new Date(project.completion_date)
                      const diffTime = actualDate.getTime() - targetDate.getTime()
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                      
                      const isOnTime = diffDays === 0
                      const isAhead = diffDays < 0
                      const isDelayed = diffDays > 0
                      
                      return (
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                            isOnTime || isAhead
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          }`}>
                            {isOnTime || isAhead ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className={`font-semibold ${
                              isOnTime || isAhead
                                ? 'text-green-700 dark:text-green-300'
                                : 'text-red-700 dark:text-red-300'
                            }`}>
                              {isOnTime ? 'On Time' : isAhead ? 'Ahead' : 'Delayed'}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {isOnTime 
                                ? 'On target date'
                                : isAhead
                                ? `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ahead`
                                : `${diffDays} day${diffDays !== 1 ? 's' : ''} late`
                              }
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      )}

      {isExpanded && (
        <CardContent className="pt-0 animate-in slide-in-from-top-2 duration-300">
          {detailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Loading details...</span>
              </div>
            </div>
          ) : businessPlanDetails.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">No details available for this project</p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Cost Analysis Section */}
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

              {/* Timeline Analysis Section */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
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
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export function ProjectReportPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  // const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterModel, setFilterModel] = useState({
    items: [] as Array<{ id: number; field: string; operator: string; value: any }>,
    logicOperator: 'and' as 'and' | 'or'
  })
  
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
  
  // Get settings for financial year calculation
  const { settings } = useSettings()
  
  // Get current user ID for fetching departments
  const { access } = useUserAccess()
  const currentUserId = access?.user?.id
  
  // Fetch user departments
  const { userDepartments, loading: departmentsLoading } = useUsersDepartments({ 
    user_id: currentUserId, 
    all: true 
  })
  
  // Calculate default dates from current financial year if not in URL
  const defaultFinancialYearDates = useMemo(() => {
    if (!settings) return { from_date: '', to_date: '' }
    const yearStart = settings.year_start || '07-01'
    const yearEnd = settings.year_end || '06-30'
    const dates = getCurrentFinancialYearDates(yearStart, yearEnd)
    return dates || { from_date: '', to_date: '' }
  }, [settings])
  
  const initialFromDate = useMemo(() => {
    const urlFromDate = searchParams.get('from_date')
    return urlFromDate || defaultFinancialYearDates.from_date
  }, [searchParams, defaultFinancialYearDates])
  
  const initialToDate = useMemo(() => {
    const urlToDate = searchParams.get('to_date')
    return urlToDate || defaultFinancialYearDates.to_date
  }, [searchParams, defaultFinancialYearDates])
  
  const [ptypeIdFilter, setPtypeIdFilter] = useState<string>(initialPtypeId)
  const [fsIdFilter, setFsIdFilter] = useState<string>(initialFsId)
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus)
  const [deptIdFilter, setDeptIdFilter] = useState<string>(initialDeptId)
  const [fromDate, setFromDate] = useState<string>(initialFromDate)
  const [toDate, setToDate] = useState<string>(initialToDate)
  
  // Set default dates to current financial year if not set and settings are available
  useEffect(() => {
    // Only set defaults if dates are empty and not in URL params
    const hasUrlFromDate = searchParams.get('from_date')
    const hasUrlToDate = searchParams.get('to_date')
    
    if (settings && defaultFinancialYearDates.from_date && defaultFinancialYearDates.to_date && !hasUrlFromDate && !hasUrlToDate) {
      // Only update if current dates are empty (to avoid overwriting user-set dates)
      if (!fromDate && !toDate) {
        setFromDate(defaultFinancialYearDates.from_date)
        setToDate(defaultFinancialYearDates.to_date)
      }
    }
  }, [settings, fromDate, toDate, searchParams, defaultFinancialYearDates])
  
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
    
    // Update state from URL params (only if different to avoid unnecessary updates)
    setPtypeIdFilter(prev => {
      const newValue = ptypeParam || 'all'
      return prev !== newValue ? newValue : prev
    })
    setFsIdFilter(prev => {
      const newValue = fsParam === 'null' ? 'null' : (fsParam || 'all')
      return prev !== newValue ? newValue : prev
    })
    setStatusFilter(prev => {
      const newValue = statusParam || 'all'
      return prev !== newValue ? newValue : prev
    })
    setDeptIdFilter(prev => {
      const newValue = deptParam || 'all'
      return prev !== newValue ? newValue : prev
    })
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

  // Update URL query params when filters change (but not when URL changes)
  useEffect(() => {
    // Skip if we're updating from URL params
    if (isUpdatingFromUrl.current) {
      return
    }
    
    // Build expected URL params from current filter state
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
    if (fromDate) {
      params.set('from_date', fromDate)
    }
    if (toDate) {
      params.set('to_date', toDate)
    }
    
    // Compare with current URL params
    const currentParams = new URLSearchParams(searchParams.toString())
    const newParamsString = params.toString()
    const currentParamsString = currentParams.toString()
    
    // Only update URL if params have actually changed
    if (newParamsString !== currentParamsString) {
      const newUrl = `${pathname}${newParamsString ? `?${newParamsString}` : ''}`
      router.replace(newUrl, { scroll: false })
    }
  }, [ptypeIdFilter, fsIdFilter, statusFilter, deptIdFilter, fromDate, toDate, router, pathname, searchParams])
  
  // Build filters object for server-side filtering
  const serverFilters = useMemo(() => {
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
  
  const { businessPlans, loading, error } = useBusinessPlans(serverFilters)
  const { projectTypes } = useProjectTypes({ all: true })
  const { fundingSources } = useFundingSources({ all: true })

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
    // Server-side filters (ptype_id, dept_id, fs_id) are already applied via API
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
    return filtered
  }, [businessPlans, searchTerm, filterModel, projectTypes])

  const hasActiveFilters = useMemo(() => {
    const hasSearch = searchTerm && searchTerm.trim() !== ''
    const hasAdvancedFilters = filterModel.items.length > 0
    const hasPtype = ptypeIdFilter !== 'all'
    const hasFs = fsIdFilter !== 'all'
    const hasStatus = statusFilter !== 'all'
    const hasFromDate = fromDate && fromDate.trim() !== ''
    const hasToDate = toDate && toDate.trim() !== ''
    return hasAdvancedFilters || hasSearch || hasPtype || hasFs || hasStatus || hasFromDate || hasToDate
  }, [filterModel.items.length, searchTerm, ptypeIdFilter, fsIdFilter, statusFilter, fromDate, toDate])

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
    setFilterModel({ items: [], logicOperator: 'and' })
    setSearchTerm('')
    setPtypeIdFilter('all')
    setFsIdFilter('all')
    setStatusFilter('all')
    setDeptIdFilter('all')
    setFromDate('')
    setToDate('')
  }

  const toggleProjectExpansion = (projectId: number) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev)
      if (newSet.has(projectId)) {
        newSet.delete(projectId)
      } else {
        newSet.add(projectId)
      }
      return newSet
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-gray-600 dark:text-gray-400" />
          <span className="text-gray-600 dark:text-gray-400">Loading projects...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects Summary</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          View cost, timeline and progress analysis for all projects
        </p>
      </div>

      {/* Filters Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* First Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fundingSource">Funding Source</Label>
                <Select value={fsIdFilter} onValueChange={setFsIdFilter}>
                  <SelectTrigger id="fundingSource">
                    <SelectValue placeholder="All funding sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Funding Sources</SelectItem>
                    <SelectItem value="null">No Funding Source</SelectItem>
                    {fundingSources.map((fs) => (
                      <SelectItem key={fs.id} value={fs.id.toString()}>
                        {fs.name}
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
                    <SelectItem value="1">Started</SelectItem>
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
                    {userDepartments
                      .filter(ud => ud.department?.dept_id)
                      .map((ud) => (
                        <SelectItem key={ud.department!.dept_id} value={ud.department!.dept_id.toString()}>
                          {ud.department!.name}
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
                  <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-6 px-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                    Clear All
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
                  {ptypeIdFilter !== 'all' && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                      <span>Project Type: {getProjectTypeName(parseInt(ptypeIdFilter))}</span>
                      <button onClick={() => setPtypeIdFilter('all')} className="ml-1 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {fsIdFilter !== 'all' && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                      <span>Funding Source: {fsIdFilter === 'null' ? 'No Funding Source' : getFundingSourceNameById(parseInt(fsIdFilter))}</span>
                      <button onClick={() => setFsIdFilter('all')} className="ml-1 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {statusFilter !== 'all' && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                      <span>Status: {statusFilter === '0' ? 'Planned' : statusFilter === '1' ? 'Started' : statusFilter === '2' ? 'Completed' : 'Cancelled'}</span>
                      <button onClick={() => setStatusFilter('all')} className="ml-1 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-full p-0.5">
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

      {filteredBusinessPlans.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-2">
              <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500" />
              <p className="text-lg font-medium text-gray-900 dark:text-white">No projects found</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {hasActiveFilters ? 'Try adjusting your filters' : 'There are no projects to display'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBusinessPlans.map((project) => (
            <ProjectSummaryCard
              key={project.id}
              project={project}
              isExpanded={expandedProjects.has(project.id)}
              onToggle={() => toggleProjectExpansion(project.id)}
            />
          ))}
        </div>
      )}

      {/* <AdvancedFilterDialog
        isOpen={isFilterDialogOpen}
        onClose={() => setIsFilterDialogOpen(false)}
        onApplyFilters={() => {}}
        filterModel={filterModel}
        onFilterModelChange={setFilterModel}
        fields={projectFilterFields}
        getOperatorsForField={getProjectOperatorsForField}
        getValueInput={getProjectValueInput}
      /> */}
    </div>
  )
}
