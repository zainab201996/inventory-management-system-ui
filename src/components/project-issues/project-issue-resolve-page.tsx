'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProjectIssues } from '@/hooks/use-project-issues'
import { useUserAccess, getSlugForName } from '@/hooks/use-user-access'
import { formatDate } from '@/lib/utils'
import { ProjectIssue } from '@/types'
import { Search, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

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

export function ProjectIssueResolvePage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProjectIssue, setSelectedProjectIssue] = useState<ProjectIssue | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [isResolving, setIsResolving] = useState(false)

  const { projectIssues, loading, error, completeProjectIssue } = useProjectIssues({ all: true })
  const { access } = useUserAccess()
  const hasShowPermission = access?.aggregatedPermissions?.[getSlugForName('Project Issue Complete')]?.show === true
  const hasEditPermission = access?.aggregatedPermissions?.[getSlugForName('Project Issue Complete')]?.edit === true

  // Filter to show only open issues (status = 0) - these can be resolved
  const filteredProjectIssues = useMemo(() => {
    let filtered = projectIssues.filter(pi => pi.status === 0)
    if (searchTerm) {
      filtered = filtered.filter(projectIssue =>
        projectIssue.issue?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        projectIssue.business_plan?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    return filtered
  }, [projectIssues, searchTerm])

  const handleResolveIssue = (projectIssue: ProjectIssue) => {
    setSelectedProjectIssue(projectIssue)
    setRemarks(projectIssue.remarks_3 || '')
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!selectedProjectIssue) return
    
    try {
      setIsResolving(true)
      await completeProjectIssue(selectedProjectIssue.pi_id, remarks.trim() || null)
      setIsDialogOpen(false)
      setSelectedProjectIssue(null)
      setRemarks('')
    } catch (error) {
      console.error('Failed to resolve project issue:', error)
    } finally {
      setIsResolving(false)
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Resolve Project Issues</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Mark open project issues as resolved with resolution details</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Open Project Issues</CardTitle>
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
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">No open project issues found</p>
              <p className="text-gray-500 dark:text-gray-400">All issues are already resolved or open, or no issues match your search</p>
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
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          Step:{' '}
                          {projectIssue.step_name
                            || (projectIssue.s_id != null ? `Step ${projectIssue.s_id}` : 'N/A')}
                        </p>
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(projectIssue.status)}`}>
                            {getStatusDisplay(projectIssue.status)}
                          </span>
                        </div>
                        {hasEditPermission && (
                          <Button
                            size="sm"
                            onClick={() => handleResolveIssue(projectIssue)}
                            className="mt-2 bg-green-500 hover:bg-green-600 text-white"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Mark as Resolved
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
        if (!open && isResolving) return
        setIsDialogOpen(open)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Resolved</DialogTitle>
            <DialogDescription>
              Mark the issue <strong>{selectedProjectIssue?.issue?.name}</strong> for project <strong>{selectedProjectIssue?.business_plan?.name}</strong> as resolved
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="remarks_3">Resolved Remarks</Label>
              <Textarea
                id="remarks_3"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter resolved remarks..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              if (isResolving) return
              setIsDialogOpen(false)
              setSelectedProjectIssue(null)
              setRemarks('')
            }} disabled={isResolving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isResolving}>
              {isResolving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resolving...
                </>
              ) : (
                'Mark as Resolved'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
