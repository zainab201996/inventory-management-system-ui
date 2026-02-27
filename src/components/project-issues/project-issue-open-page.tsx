'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Search, Loader2, AlertCircle, Plus, Edit, Trash2 } from 'lucide-react'
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

export function ProjectIssueOpenPage() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProjectIssue, setSelectedProjectIssue] = useState<ProjectIssue | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [remarks, setRemarks] = useState('')
  
  // Create dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ 
    issue_id: 0, 
    proj_id: 0,
    s_id: 0,
    remarks_1: ''
  })
  const [errors, setErrors] = useState<{ issue_id?: string; proj_id?: string; s_id?: string }>({})
  const [isCreating, setIsCreating] = useState(false)

  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingProjectIssue, setEditingProjectIssue] = useState<ProjectIssue | null>(null)
  const [editFormData, setEditFormData] = useState({ 
    issue_id: 0, 
    proj_id: 0,
    remarks_1: '', // Opening remarks - editable when status is 0 (open)
    remarks_3: '' // Resolved remarks - editable when status is 2 (resolved)
  })
  const [editErrors, setEditErrors] = useState<{ issue_id?: string; proj_id?: string }>({})
  const [isUpdating, setIsUpdating] = useState(false)

  // Delete confirmation dialog state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [projectIssueToDelete, setProjectIssueToDelete] = useState<ProjectIssue | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { projectIssues, loading, error, openProjectIssue, createProjectIssueAction, updateProjectIssue, deleteProjectIssue } = useProjectIssues({ all: true })
  const { businessPlans, loading: businessPlansLoading } = useBusinessPlans({ all: true, status: 1 })
  const { issues, loading: issuesLoading } = useIssues({ all: true })
  const { issueCategories } = useIssueCategories({ all: true })
  const { access } = useUserAccess()

  // Steps for selected business plan (for create dialog)
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

        // Only include started steps (status === 1)
        const startedDetails = (rawDetails as any[]).filter(d => d.status === 1)

        const stepMap = new Map<number, string>()
        for (const d of startedDetails as any[]) {
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
  const hasShowPermission = access?.aggregatedPermissions?.[getSlugForName('Project Issue Open')]?.show === true
  const hasEditPermission = access?.aggregatedPermissions?.[getSlugForName('Project Issue Open')]?.edit === true
  const hasDeletePermission = access?.aggregatedPermissions?.[getSlugForName('Project Issue Open')]?.edit === true
  // Use create permission on Project Issue Open page for the action endpoint
  const hasCreatePermission = access?.aggregatedPermissions?.[getSlugForName('Project Issue Open')]?.edit === true

  // Show only open issues (status === 0)
  const filteredProjectIssues = useMemo(() => {
    let filtered = projectIssues.filter(projectIssue => projectIssue.status === 0)
    if (searchTerm) {
      filtered = filtered.filter(projectIssue =>
        projectIssue.issue?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        projectIssue.business_plan?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    return filtered
  }, [projectIssues, searchTerm])

  const handleOpenIssue = (projectIssue: ProjectIssue) => {
    setSelectedProjectIssue(projectIssue)
    setRemarks(projectIssue.remarks_1 || '')
    setIsDialogOpen(true)
  }

  const validateForm = () => {
    const newErrors: { issue_id?: string; proj_id?: string; s_id?: string } = {}
    
    if (!formData.issue_id || formData.issue_id === 0) {
      newErrors.issue_id = 'Issue is required'
    }
    
    if (!formData.proj_id || formData.proj_id === 0) {
      newErrors.proj_id = 'Business plan is required'
    }

    if (!formData.s_id || formData.s_id === 0) {
      newErrors.s_id = 'Step is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!selectedProjectIssue) return
    
    await openProjectIssue(selectedProjectIssue.pi_id, remarks.trim() || null)
    setIsDialogOpen(false)
    setSelectedProjectIssue(null)
    setRemarks('')
  }

  const handleCreateSubmit = async () => {
    if (!validateForm()) {
      return
    }
    
    try {
      setIsCreating(true)
      await createProjectIssueAction({
        issue_id: formData.issue_id,
        proj_id: formData.proj_id,
        s_id: formData.s_id,
        remarks_1: formData.remarks_1.trim() || null
      })
      setIsCreateDialogOpen(false)
      setFormData({ 
        issue_id: 0, 
        proj_id: 0,
        s_id: 0,
        remarks_1: ''
      })
      setErrors({})
    } catch (error) {
      console.error('Failed to create project issue:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleEdit = (projectIssue: ProjectIssue) => {
    if (!hasEditPermission) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'You do not have permission to edit project issues',
      })
      return
    }
    setEditingProjectIssue(projectIssue)
    setEditFormData({ 
      issue_id: projectIssue.issue_id, 
      proj_id: projectIssue.proj_id,
      remarks_1: projectIssue.remarks_1 || '',
      remarks_3: projectIssue.remarks_3 || ''
    })
    setEditErrors({})
    setIsEditDialogOpen(true)
  }

  const validateEditForm = () => {
    const newErrors: { issue_id?: string; proj_id?: string } = {}
    
    if (!editFormData.issue_id || editFormData.issue_id === 0) {
      newErrors.issue_id = 'Issue is required'
    }
    
    if (!editFormData.proj_id || editFormData.proj_id === 0) {
      newErrors.proj_id = 'Business plan is required'
    }
    
    setEditErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleEditSubmit = async () => {
    if (!validateEditForm() || !editingProjectIssue) {
      return
    }
    
    try {
      setIsUpdating(true)
      // Update issue_id, proj_id, and remarks based on status
      const updatePayload: any = {
        issue_id: editFormData.issue_id,
        proj_id: editFormData.proj_id
      }
      // remarks_1 (Opening remarks) can be updated when status is 0 (open)
      if (editingProjectIssue.status === 0) {
        updatePayload.remarks_1 = editFormData.remarks_1.trim() || null
      }
      // remarks_3 (Resolved remarks) can be updated when status is 2 (resolved)
      if (editingProjectIssue.status === 2) {
        updatePayload.remarks_3 = editFormData.remarks_3.trim() || null
      }
      await updateProjectIssue(editingProjectIssue.pi_id, updatePayload)
      setIsEditDialogOpen(false)
      setEditingProjectIssue(null)
      setEditFormData({ 
        issue_id: 0, 
        proj_id: 0,
        remarks_1: '',
        remarks_3: ''
      })
      setEditErrors({})
    } catch (error) {
      console.error('Failed to update project issue:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = (projectIssue: ProjectIssue) => {
    if (!hasDeletePermission) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'You do not have permission to delete project issues',
      })
      return
    }
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

  if (!hasShowPermission) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">You do not have permission to view this page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Open Project Issues</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Create new project issues</p>
        </div>
        <Button onClick={() => {
          if (!hasCreatePermission) {
            toast({
              variant: 'destructive',
              title: 'Permission Denied',
              description: 'You do not have permission to open project issues',
            })
            return
          }
          setIsCreateDialogOpen(true)
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Open Project Issue
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Project Issues</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search issues..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
              <p className="text-gray-500 dark:text-gray-400">
                {hasCreatePermission 
                  ? 'Get started by creating your first project issue' 
                  : 'No issues match your search'}
              </p>
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
                        {projectIssue.s_id != null && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Step:{' '}
                            {projectIssue.step_name || `Step ${projectIssue.s_id}`}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(projectIssue.status)}`}>
                            {getStatusDisplay(projectIssue.status)}
                          </span>
                        </div>
                        {/* {hasEditPermission && projectIssue.status !== 0 && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenIssue(projectIssue)}
                            className="mt-2 bg-blue-500 hover:bg-blue-600 text-white"
                          >
                            Reopen Issue
                          </Button>
                        )} */}
                        {/* {projectIssue.status === 0 && (
                          <span className="mt-2 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                            Already Open
                          </span>
                        )} */}
                      </div>
                      <div className="flex gap-1 ml-2">
                        {hasEditPermission && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEdit(projectIssue)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {hasDeletePermission && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(projectIssue)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        // Open issue dialog doesn't have a loading state, but keep for consistency
        setIsDialogOpen(open)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Project Issue</DialogTitle>
            <DialogDescription>
              Reopen the issue <strong>{selectedProjectIssue?.issue?.name}</strong> for project <strong>{selectedProjectIssue?.business_plan?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="remarks_1">Opening Remarks</Label>
              <Textarea
                id="remarks_1"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter opening remarks..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDialogOpen(false)
              setSelectedProjectIssue(null)
              setRemarks('')
            }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Open Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        if (!open && isCreating) return
        setIsCreateDialogOpen(open)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Project Issue</DialogTitle>
            <DialogDescription>
              Create a new project issue. The issue will be created with status "Open".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="issue_id">Issue <span className="text-red-500">*</span></Label>
              <Select
                value={formData.issue_id.toString()}
                onValueChange={(value) => setFormData({ ...formData, issue_id: parseInt(value) })}
              >
                <SelectTrigger id="issue_id" className={errors.issue_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select an issue" />
                </SelectTrigger>
                <SelectContent>
                  {issuesLoading ? (
                    <div className="p-2 text-center text-sm text-gray-500">Loading issues...</div>
                  ) : issues.length === 0 ? (
                    <div className="p-2 text-center text-sm text-gray-500">No issues available</div>
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
                  setFormData({ ...formData, proj_id: parseInt(value, 10), s_id: 0 })
                  if (errors.proj_id) {
                    setErrors(prev => ({ ...prev, proj_id: undefined }))
                  }
                  if (errors.s_id) {
                    setErrors(prev => ({ ...prev, s_id: undefined }))
                  }
                }}
              >
                <SelectTrigger id="proj_id" className={errors.proj_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select a business plan" />
                </SelectTrigger>
                <SelectContent>
                  {businessPlansLoading ? (
                    <div className="p-2 text-center text-sm text-gray-500">Loading business plans...</div>
                  ) : businessPlans.length === 0 ? (
                    <div className="p-2 text-center text-sm text-gray-500">No business plans available</div>
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
            <div className="space-y-2">
              <Label htmlFor="create_s_id">Step <span className="text-red-500">*</span></Label>
              <Select
                disabled={formData.proj_id === 0 || stepsLoading || stepOptions.length === 0}
                value={formData.s_id > 0 ? formData.s_id.toString() : undefined}
                onValueChange={(value) => {
                  setFormData({ ...formData, s_id: parseInt(value, 10) })
                  if (errors.s_id) {
                    setErrors(prev => ({ ...prev, s_id: undefined }))
                  }
                }}
              >
                <SelectTrigger id="create_s_id" className={errors.s_id ? 'border-red-500' : ''}>
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
                    <div className="p-2 text-center text-sm text-gray-500">
                      Select a business plan first
                    </div>
                  ) : stepsLoading ? (
                    <div className="p-2 text-center text-sm text-gray-500">Loading steps...</div>
                  ) : stepOptions.length === 0 ? (
                    <div className="p2 text-center text-sm text-gray-500">No started steps available</div>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              if (isCreating) return
              setIsCreateDialogOpen(false)
              setFormData({ 
                issue_id: 0, 
                proj_id: 0,
                s_id: 0,
                remarks_1: ''
              })
              setErrors({})
            }} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubmit} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Issue'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        if (!open && isUpdating) return
        setIsEditDialogOpen(open)
        if (!open) {
          setEditingProjectIssue(null)
          setEditFormData({ 
            issue_id: 0, 
            proj_id: 0,
            remarks_1: '',
            remarks_3: ''
          })
          setEditErrors({})
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project Issue</DialogTitle>
            <DialogDescription>
              Update project issue information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_issue_id">Issue <span className="text-red-500">*</span></Label>
              <Select
                value={editFormData.issue_id.toString()}
                onValueChange={(value) => setEditFormData({ ...editFormData, issue_id: parseInt(value) })}
              >
                <SelectTrigger id="edit_issue_id" className={editErrors.issue_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select an issue" />
                </SelectTrigger>
                <SelectContent>
                  {issuesLoading ? (
                    <div className="p-2 text-center text-sm text-gray-500">Loading issues...</div>
                  ) : issues.length === 0 ? (
                    <div className="p-2 text-center text-sm text-gray-500">No issues available</div>
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
              {editErrors.issue_id && (
                <p className="text-sm text-red-500">{editErrors.issue_id}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_proj_id">Business Plan <span className="text-red-500">*</span></Label>
              <Select
                value={editFormData.proj_id.toString()}
                onValueChange={(value) => setEditFormData({ ...editFormData, proj_id: parseInt(value) })}
              >
                <SelectTrigger id="edit_proj_id" className={editErrors.proj_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select a business plan" />
                </SelectTrigger>
                <SelectContent>
                  {businessPlansLoading ? (
                    <div className="p-2 text-center text-sm text-gray-500">Loading business plans...</div>
                  ) : businessPlans.length === 0 ? (
                    <div className="p-2 text-center text-sm text-gray-500">No business plans available</div>
                  ) : (
                    businessPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id.toString()}>
                        {plan.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {editErrors.proj_id && (
                <p className="text-sm text-red-500">{editErrors.proj_id}</p>
              )}
            </div>
            {editingProjectIssue && (
              <>
                {/* Opening Remarks (remarks_1) - Editable when status is 0 (open) */}
                <div className="space-y-2">
                  <Label htmlFor="edit_remarks_1">
                    Opening Remarks
                    {editingProjectIssue.status === 0 && <span className="text-gray-500 dark:text-gray-400 text-xs ml-2">(Editable when open)</span>}
                  </Label>
                  {editingProjectIssue.status === 0 ? (
                    <>
                      <Textarea
                        id="edit_remarks_1"
                        value={editFormData.remarks_1}
                        onChange={(e) => setEditFormData({ ...editFormData, remarks_1: e.target.value })}
                        placeholder="Enter opening remarks..."
                        rows={3}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        This field can be edited when the issue status is "Open".
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 rounded-md p-3 border border-gray-200 dark:border-gray-700 min-h-[60px]">
                        {editingProjectIssue.remarks_1 || <span className="text-gray-400 dark:text-gray-500 italic">No remarks added</span>}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        This field can only be edited when the issue status is "Open"
                      </p>
                    </>
                  )}
                </div>
                
                {/* Resolved Remarks (remarks_3) - Editable when status is 2 (resolved) */}
                {editingProjectIssue.status === 2 && (
                  <div className="space-y-2">
                    <Label htmlFor="edit_remarks_3">
                      Resolved Remarks
                      <span className="text-gray-500 dark:text-gray-400 text-xs ml-2">(Editable when resolved)</span>
                    </Label>
                    <Textarea
                      id="edit_remarks_3"
                      value={editFormData.remarks_3}
                      onChange={(e) => setEditFormData({ ...editFormData, remarks_3: e.target.value })}
                      placeholder="Enter resolved remarks..."
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      This field can be edited when the issue status is "Resolved"
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              if (isUpdating) return
              setIsEditDialogOpen(false)
              setEditingProjectIssue(null)
              setEditFormData({ 
                issue_id: 0, 
                proj_id: 0,
                remarks_1: '',
                remarks_3: ''
              })
              setEditErrors({})
            }} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={(open) => {
        if (!open && isDeleting) return
        setIsDeleteConfirmOpen(open)
        if (!open) {
          setProjectIssueToDelete(null)
        }
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
