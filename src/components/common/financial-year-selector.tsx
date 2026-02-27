'use client'

import { useMemo, useEffect, useRef } from 'react'
import { useSettings } from '@/hooks/use-settings'
import { generateFinancialYears, getCurrentFinancialYear } from '@/lib/utils'
import { FinancialYear } from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface FinancialYearSelectorProps {
  value?: string // The year value (e.g., "2025")
  onValueChange?: (value: string, financialYear: FinancialYear | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  defaultValue?: string // Optional default value (if not provided, current year will be used)
}

export function FinancialYearSelector({
  value,
  onValueChange,
  placeholder = 'Select financial year',
  className,
  disabled = false,
  defaultValue,
}: FinancialYearSelectorProps) {
  const { settings, loading, error } = useSettings()

  const financialYears = useMemo(() => {
    if (!settings) return []
    
    // Use default values if settings are not available
    const yearStart = settings.year_start || '07-01'
    const yearEnd = settings.year_end || '06-30'
    
    return generateFinancialYears(yearStart, yearEnd)
  }, [settings])

  // Get the current financial year for labeling
  const currentFinancialYear = useMemo(() => {
    if (!settings) return null
    const yearStart = settings.year_start || '07-01'
    const yearEnd = settings.year_end || '06-30'
    return getCurrentFinancialYear(yearStart, yearEnd)
  }, [settings])

  const hasInitialized = useRef(false)

  // Determine the effective value (use provided value, defaultValue, or auto-select current year)
  const effectiveValue = useMemo(() => {
    if (value !== undefined) return value
    if (defaultValue !== undefined) return defaultValue
    
    // Auto-select current financial year if no value is provided
    if (!loading && settings && financialYears.length > 0) {
      const yearStart = settings.year_start || '07-01'
      const yearEnd = settings.year_end || '06-30'
      const currentYear = getCurrentFinancialYear(yearStart, yearEnd)
      
      if (currentYear !== null) {
        const currentFinancialYear = financialYears.find(fy => fy.year === currentYear)
        if (currentFinancialYear) {
          return currentYear.toString()
        }
      }
    }
    
    return undefined
  }, [value, defaultValue, loading, settings, financialYears])

  // Auto-select current financial year on initial load if no value is provided
  useEffect(() => {
    if (
      !hasInitialized.current &&
      !loading &&
      settings &&
      !value &&
      !defaultValue &&
      financialYears.length > 0 &&
      onValueChange &&
      effectiveValue
    ) {
      const currentFinancialYear = financialYears.find(fy => fy.year.toString() === effectiveValue)
      if (currentFinancialYear) {
        hasInitialized.current = true
        onValueChange(effectiveValue, currentFinancialYear)
      }
    }
  }, [loading, settings, value, defaultValue, financialYears, effectiveValue, onValueChange])

  const handleValueChange = (selectedValue: string) => {
    const selectedFinancialYear = financialYears.find(
      (fy) => fy.year.toString() === selectedValue
    ) || null
    
    if (onValueChange) {
      onValueChange(selectedValue, selectedFinancialYear)
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-sm text-red-500 ${className}`}>
        Failed to load financial years
      </div>
    )
  }

  if (financialYears.length === 0) {
    return (
      <div className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>
        No financial years available
      </div>
    )
  }

  return (
    <Select
      value={effectiveValue}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {financialYears.map((financialYear) => {
          const isCurrent = currentFinancialYear !== null && financialYear.year === currentFinancialYear
          return (
            <SelectItem key={financialYear.year} value={financialYear.year.toString()}>
              <span className="flex items-center gap-2">
                <span>{financialYear.label}</span>
                {isCurrent && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">(current)</span>
                )}
              </span>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

