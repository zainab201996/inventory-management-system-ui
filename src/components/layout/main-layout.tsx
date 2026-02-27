'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { RouteGuard } from '@/components/auth/route-guard'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev)
  }

  return (
    <RouteGuard>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
        <div className="flex flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out">
          <Header
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={toggleSidebar}
          />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-gray-900 custom-scrollbar">
            {/* <div className="max-w-6xl"> */}
            <div className="p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </RouteGuard>
  )
}

