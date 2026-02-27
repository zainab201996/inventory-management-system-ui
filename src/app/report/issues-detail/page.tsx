import { Suspense } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { IssuesDetailReportPage } from '@/components/issues-detail-report/issues-detail-report-page'

export default function IssuesDetailReportRoutePage() {
  return (
    <MainLayout>
      <Suspense fallback={<div>Loading...</div>}>
        <IssuesDetailReportPage />
      </Suspense>
    </MainLayout>
  )
}

