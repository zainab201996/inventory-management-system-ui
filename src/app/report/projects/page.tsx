import { Suspense } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { ProjectsPage } from '@/components/projects/projects-page'
import { Loader2 } from 'lucide-react'

export default function ProjectsPageRoute() {
  return (
    <MainLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading projects...</span>
          </div>
        </div>
      }>
        <ProjectsPage />
      </Suspense>
    </MainLayout>
  )
}

