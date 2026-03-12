'use client'

import { User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api-client'
import { useRouter } from 'next/navigation'
import { ThemeToggleButton } from './theme-toggle-button'
import { useUserAccess } from '@/hooks/use-user-access'

interface HeaderProps {
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
}

export function Header({ isSidebarCollapsed, onToggleSidebar }: HeaderProps) {
  const router = useRouter()
  const { access } = useUserAccess()

  const handleLogout = () => {
    apiClient.logout()
    router.push('/login')
  }

  // Get username, departments, and role from access data
  const username = access?.user?.username || 'User'
  const roles = access?.roles || []
  const roleNames = roles.map(role => role.role_name).join(', ') || 'User'
  const departmentName = access?.user?.department?.name || null

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="mr-2 flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white lg:h-11 lg:w-11"
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            width="16"
            height="12"
            viewBox="0 0 16 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z"
              fill="currentColor"
            />
          </svg>
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          <span className="text-sm font-semibold">IMS</span>
        </div>
        <div className="flex flex-col">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Inventory Management System
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Control panel for inventory data
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        {/* Application menu button (mobile only), matching modern-ui-boilerplate */}
        <button
          onClick={() => {}}
          className="flex items-center justify-center w-10 h-10 text-gray-700 rounded-lg z-99999 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
          aria-label="Open application menu"
          type="button"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M5.99902 10.4951C6.82745 10.4951 7.49902 11.1667 7.49902 11.9951V12.0051C7.49902 12.8335 6.82745 13.5051 5.99902 13.5051C5.1706 13.5051 4.49902 12.8335 4.49902 12.0051V11.9951C4.49902 11.1667 5.1706 10.4951 5.99902 10.4951ZM17.999 10.4951C18.8275 10.4951 19.499 11.1667 19.499 11.9951V12.0051C19.499 12.8335 18.8275 13.5051 17.999 13.5051C17.1706 13.5051 16.499 12.8335 16.499 12.0051V11.9951C16.499 11.1667 17.1706 10.4951 17.999 10.4951ZM13.499 11.9951C13.499 11.1667 12.8275 10.4951 11.999 10.4951C11.1706 10.4951 10.499 11.1667 10.499 11.9951V12.0051C10.499 12.8335 11.1706 13.5051 11.999 13.5051C12.8275 13.5051 13.499 12.8335 13.499 12.0051V11.9951Z"
              fill="currentColor"
            />
          </svg>
        </button>
        <ThemeToggleButton />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center space-x-2 rounded-full px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-500/10">
                <User className="h-4 w-4 text-orange-500 dark:text-orange-400" />
              </div>
              <div className="flex flex-col items-start">
                <p className="text-sm font-medium leading-none !text-gray-900 dark:!text-white">
                  {username}
                </p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {departmentName && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {departmentName}
                    </span>
                  )}
                  {departmentName && roleNames && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                  )}
                  {roleNames && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {roleNames}
                    </span>
                  )}
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20 focus:text-red-600 dark:focus:text-red-400"
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
