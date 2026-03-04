'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { useSettings } from '@/hooks/use-settings'
import { apiClient } from '@/lib/api-client'
import { Loader2, Settings as SettingsIcon, Calendar, Lock, AlertTriangle } from 'lucide-react'

export function SettingsPage() {
  const router = useRouter()
  const { settings, loading, error, refetch } = useSettings()
  const { toast } = useToast()
  
  // Password update form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string
    newPassword?: string
    confirmPassword?: string
  }>({})
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)

  const [currencySymbol, setCurrencySymbol] = useState('')
  const [currencyCode, setCurrencyCode] = useState('')
  const [isSavingCurrency, setIsSavingCurrency] = useState(false)

  useEffect(() => {
    if (settings) {
      setCurrencySymbol(settings.currency_symbol || '')
      setCurrencyCode(settings.currency_code || '')
    }
  }, [settings])

  const formatFinancialYear = (yearStart: string, yearEnd: string) => {
    // yearStart and yearEnd are in MM-DD format
    // Example: "07-01" to "06-30" means July 1 to June 30
    const [startMonth, startDay] = yearStart.split('-')
    const [endMonth, endDay] = yearEnd.split('-')
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
    
    const startMonthName = monthNames[parseInt(startMonth) - 1]
    const endMonthName = monthNames[parseInt(endMonth) - 1]
    
    // Determine the financial year based on current date
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // getMonth() returns 0-11, so add 1
    
    // If year_start month is greater than year_end month, it spans two calendar years
    // Example: 07-01 to 06-30 spans from July of one year to June of next year
    const startMonthNum = parseInt(startMonth)
    const endMonthNum = parseInt(endMonth)
    
    let startYear: number
    let endYear: number
    
    if (startMonthNum > endMonthNum) {
      // Financial year spans two calendar years (e.g., July to June)
      // Determine which financial year we're currently in
      if (currentMonth >= startMonthNum) {
        // We're in the first half of the financial year (e.g., July-December)
        startYear = currentYear
        endYear = currentYear + 1
      } else {
        // We're in the second half of the financial year (e.g., January-June)
        startYear = currentYear - 1
        endYear = currentYear
      }
    } else {
      // Financial year is within a single calendar year
      startYear = currentYear
      endYear = currentYear
    }
    
    return `${startMonthName} ${parseInt(startDay)}, ${startYear} to ${endMonthName} ${parseInt(endDay)}, ${endYear}`
  }

  const validatePasswordForm = (): boolean => {
    const errors: {
      currentPassword?: string
      newPassword?: string
      confirmPassword?: string
    } = {}

    if (!passwordData.currentPassword.trim()) {
      errors.currentPassword = 'Current password is required'
    }

    if (!passwordData.newPassword.trim()) {
      errors.newPassword = 'New password is required'
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = 'New password must be at least 6 characters long'
    }

    if (!passwordData.confirmPassword.trim()) {
      errors.confirmPassword = 'Please confirm your new password'
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    setPasswordErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handlePasswordUpdateClick = () => {
    if (!validatePasswordForm()) {
      return
    }
    setIsConfirmDialogOpen(true)
  }

  const handlePasswordUpdate = async () => {
    setIsConfirmDialogOpen(false)
    setIsUpdatingPassword(true)
    try {
      const response = await apiClient.updatePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      )

      if (response.success) {
        toast({
          title: 'Password Updated',
          description: 'Your password has been updated successfully. You will be logged out now.',
        })
        // Logout and redirect to login
        apiClient.logout()
        router.push('/login')
        router.refresh()
      } else {
        const errorMessage = response.message || response.error || 'Failed to update password. Please try again.'
        toast({
          title: 'Failed to Update Password',
          description: errorMessage,
          variant: 'destructive',
        })
        setIsUpdatingPassword(false)
      }
    } catch (err: any) {
      const errorMessage = err?.message || err?.response?.data?.message || err?.response?.data?.error || 'Failed to update password. Please try again.'
      toast({
        title: 'Failed to Update Password',
        description: errorMessage,
        variant: 'destructive',
      })
      setIsUpdatingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Settings
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configure system settings and preferences
          </p>
          <nav>
            <ol className="mt-1 flex items-center gap-1.5">
              <li>
                <Link
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"
                  href="/"
                >
                  Home
                  <svg
                    className="stroke-current"
                    width="17"
                    height="16"
                    viewBox="0 0 17 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </li>
              <li className="text-sm text-gray-800 dark:text-white/90">
                Settings
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium text-gray-800 dark:text-white/90 flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            System Settings
          </CardTitle>
          <CardDescription className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View current system configuration (read-only)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading settings...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : settings ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Current Financial Year
                  </Label>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatFinancialYear(settings.year_start, settings.year_end)}
                    </p>
                    {/* <div className="mt-2 flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>
                        <span className="font-medium">Start:</span> {settings.year_start}
                      </span>
                      <span>
                        <span className="font-medium">End:</span> {settings.year_end}
                      </span>
                    </div> */}
                  </div>
                </div>

                {/* <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Settings Information
                  </Label>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Settings ID:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{settings.id}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Created:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatDate(settings.created_at)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Last Updated:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatDate(settings.updated_at)}</span>
                    </div>
                  </div>
                </div> */}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Currency Symbol
                  </Label>
                  <Input
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    placeholder="e.g. Rs"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Short symbol shown before amounts (e.g. Rs, AED, $, €).
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Currency Code
                  </Label>
                  <Input
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                    placeholder="e.g. PKR"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ISO-like code for reports (e.g. PKR, AED, USD).
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (settings) {
                      setCurrencySymbol(settings.currency_symbol || '')
                      setCurrencyCode(settings.currency_code || '')
                    }
                  }}
                  disabled={isSavingCurrency}
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    setIsSavingCurrency(true)
                    try {
                      const response = await apiClient.updateSettings({
                        currency_symbol: currencySymbol || undefined,
                        currency_code: currencyCode || undefined,
                      })
                      if (response.success) {
                        toast({
                          title: 'Currency Updated',
                          description: 'Currency settings have been saved.',
                        })
                        await refetch()
                      } else {
                        toast({
                          title: 'Failed to Update Currency',
                          description: response.message || response.error || 'Please try again.',
                          variant: 'destructive',
                        })
                      }
                    } catch (err: any) {
                      toast({
                        title: 'Failed to Update Currency',
                        description: err?.message || 'Please try again.',
                        variant: 'destructive',
                      })
                    } finally {
                      setIsSavingCurrency(false)
                    }
                  }}
                  disabled={isSavingCurrency}
                >
                  {isSavingCurrency ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Currency'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No settings found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium text-gray-800 dark:text-white/90 flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Update your account password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Current Password
              </Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => {
                  setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  if (passwordErrors.currentPassword) {
                    setPasswordErrors({ ...passwordErrors, currentPassword: undefined })
                  }
                }}
                placeholder="Enter your current password"
                className={passwordErrors.currentPassword ? 'border-red-500' : ''}
              />
              {passwordErrors.currentPassword && (
                <p className="text-sm text-red-600 dark:text-red-400">{passwordErrors.currentPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                New Password
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => {
                  setPasswordData({ ...passwordData, newPassword: e.target.value })
                  if (passwordErrors.newPassword) {
                    setPasswordErrors({ ...passwordErrors, newPassword: undefined })
                  }
                  // Clear confirm password error if passwords now match
                  if (passwordErrors.confirmPassword && e.target.value === passwordData.confirmPassword) {
                    setPasswordErrors({ ...passwordErrors, confirmPassword: undefined })
                  }
                }}
                placeholder="Enter your new password (min. 6 characters)"
                className={passwordErrors.newPassword ? 'border-red-500' : ''}
              />
              {passwordErrors.newPassword && (
                <p className="text-sm text-red-600 dark:text-red-400">{passwordErrors.newPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm New Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => {
                  setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  if (passwordErrors.confirmPassword) {
                    setPasswordErrors({ ...passwordErrors, confirmPassword: undefined })
                  }
                }}
                placeholder="Confirm your new password"
                className={passwordErrors.confirmPassword ? 'border-red-500' : ''}
              />
              {passwordErrors.confirmPassword && (
                <p className="text-sm text-red-600 dark:text-red-400">{passwordErrors.confirmPassword}</p>
              )}
            </div>

            <Button
              onClick={handlePasswordUpdateClick}
              disabled={isUpdatingPassword}
              className="w-full"
            >
              {isUpdatingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Password Update
            </DialogTitle>
            <DialogDescription className="pt-2">
              Your password will be updated and you will be logged out of your session. 
              You will need to log in again with your new password.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmDialogOpen(false)}
              disabled={isUpdatingPassword}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordUpdate}
              disabled={isUpdatingPassword}
            >
              {isUpdatingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Confirm & Update Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
