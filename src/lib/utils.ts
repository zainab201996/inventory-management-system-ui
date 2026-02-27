import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { FinancialYear } from "@/types"

// Global constants
export const CURRENCY_SYMBOL = 'Rs.'
export const FINANCIAL_YEAR_START = 2025 // Hardcoded starting year for financial years

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns a user-friendly error message for display when the API returns
 * technical/database error messages (e.g. "invalid input syntax for type integer").
 */
export function getUserFriendlyApiErrorMessage(message: string): string {
  if (!message || typeof message !== 'string') return 'Something went wrong. Please try again.'
  const lower = message.toLowerCase()
  if (lower.includes('invalid input syntax') || lower.includes('syntax for type')) {
    return 'The server could not process this request. Please try again or contact support.'
  }
  if (lower.includes('duplicate key') || lower.includes('unique constraint')) {
    return 'This record already exists. Please use a different value.'
  }
  if (lower.includes('foreign key') || lower.includes('violates foreign key')) {
    return 'This action is not allowed because it would leave invalid references.'
  }
  if (lower.includes('session expired') || lower.includes('invalid or expired token')) {
    return 'Your session has expired. Please sign in again.'
  }
  return message
}

export function formatDate(date: string): string {
  if (!date) return 'N/A';
  
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
}

export function formatDateTime(date: string): string {
  if (!date) return 'N/A';
  
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function formatCurrency(amount: number): string {
  return `${CURRENCY_SYMBOL} ${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

/**
 * Returns duration between two dates as number of days (client-side calculation).
 * @param fromDate - Start date string (e.g. opened_at)
 * @param toDate - End date string (e.g. completed_at)
 * @returns Number with "day" or "days" (e.g. "0 days", "1 day", "5 days") or null if either date is missing/invalid
 */
export function getDurationBetweenDates(fromDate: string | null | undefined, toDate: string | null | undefined): string | null {
  if (!fromDate || !toDate) return null
  const from = new Date(fromDate)
  const to = new Date(toDate)
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return null
  const diffMs = to.getTime() - from.getTime()
  if (diffMs < 0) return null
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return totalDays === 1 ? '1 day' : `${totalDays} days`
}

/**
 * Generates financial years from FINANCIAL_YEAR_START to current year
 * @param yearStart - Financial year start date in MM-DD format (e.g., "07-01")
 * @param yearEnd - Financial year end date in MM-DD format (e.g., "06-30")
 * @returns Array of FinancialYear objects
 */
export function generateFinancialYears(
  yearStart: string,
  yearEnd: string
): FinancialYear[] {
  const [startMonth, startDay] = yearStart.split('-').map(Number)
  const [endMonth, endDay] = yearEnd.split('-').map(Number)
  
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1 // getMonth() returns 0-11
  
  // Determine the current financial year's starting year
  let currentFinancialYearStart: number
  if (startMonth > endMonth) {
    // Financial year spans two calendar years (e.g., July to June)
    if (currentMonth >= startMonth) {
      // We're in the first half of the financial year (e.g., July-December)
      currentFinancialYearStart = currentYear
    } else {
      // We're in the second half of the financial year (e.g., January-June)
      currentFinancialYearStart = currentYear - 1
    }
  } else {
    // Financial year is within a single calendar year
    currentFinancialYearStart = currentYear
  }
  
  const financialYears: FinancialYear[] = []
  
  // Generate financial years from FINANCIAL_YEAR_START to current financial year
  for (let year = FINANCIAL_YEAR_START; year <= currentFinancialYearStart; year++) {
    let fromYear: number
    let toYear: number
    
    if (startMonth > endMonth) {
      // Financial year spans two calendar years
      fromYear = year
      toYear = year + 1
    } else {
      // Financial year is within a single calendar year
      fromYear = year
      toYear = year
    }
    
    // Format dates as ISO strings (YYYY-MM-DD)
    const fromDate = `${fromYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`
    const toDate = `${toYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
    
    // Create label (e.g., "FY 2025-2026" or "FY 2025")
    const label = fromYear === toYear 
      ? `FY ${fromYear}` 
      : `FY ${fromYear}-${toYear}`
    
    financialYears.push({
      year: fromYear,
      label,
      from_date: fromDate,
      to_date: toDate,
    })
  }
  
  // Reverse to show most recent years first
  return financialYears.reverse()
}

/**
 * Gets the current financial year based on settings
 * @param yearStart - Financial year start date in MM-DD format (e.g., "07-01")
 * @param yearEnd - Financial year end date in MM-DD format (e.g., "06-30")
 * @returns The current financial year's starting year, or null if unable to determine
 */
export function getCurrentFinancialYear(
  yearStart: string,
  yearEnd: string
): number | null {
  const [startMonth, startDay] = yearStart.split('-').map(Number)
  const [endMonth, endDay] = yearEnd.split('-').map(Number)
  
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1 // getMonth() returns 0-11
  
  // Determine the current financial year's starting year
  let currentFinancialYearStart: number
  if (startMonth > endMonth) {
    // Financial year spans two calendar years (e.g., July to June)
    if (currentMonth >= startMonth) {
      // We're in the first half of the financial year (e.g., July-December)
      currentFinancialYearStart = currentYear
    } else {
      // We're in the second half of the financial year (e.g., January-June)
      currentFinancialYearStart = currentYear - 1
    }
  } else {
    // Financial year is within a single calendar year
    currentFinancialYearStart = currentYear
  }
  
  return currentFinancialYearStart
}

/**
 * Gets the current financial year's from_date and to_date based on settings
 * @param yearStart - Financial year start date in MM-DD format (e.g., "07-01")
 * @param yearEnd - Financial year end date in MM-DD format (e.g., "06-30")
 * @returns Object with from_date and to_date in YYYY-MM-DD format, or null if unable to determine
 */
export function getCurrentFinancialYearDates(
  yearStart: string,
  yearEnd: string
): { from_date: string; to_date: string } | null {
  const [startMonth, startDay] = yearStart.split('-').map(Number)
  const [endMonth, endDay] = yearEnd.split('-').map(Number)
  
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1 // getMonth() returns 0-11
  
  // Determine the current financial year's starting year
  let fromYear: number
  let toYear: number
  
  if (startMonth > endMonth) {
    // Financial year spans two calendar years (e.g., July to June)
    if (currentMonth >= startMonth) {
      // We're in the first half of the financial year (e.g., July-December)
      fromYear = currentYear
      toYear = currentYear + 1
    } else {
      // We're in the second half of the financial year (e.g., January-June)
      fromYear = currentYear - 1
      toYear = currentYear
    }
  } else {
    // Financial year is within a single calendar year
    fromYear = currentYear
    toYear = currentYear
  }
  
  // Format dates as ISO strings (YYYY-MM-DD)
  const fromDate = `${fromYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`
  const toDate = `${toYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
  
  return { from_date: fromDate, to_date: toDate }
}

/**
 * Converts a date from YYYY-MM-DD format to dd/mm/yyyy format
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date string in dd/mm/yyyy format, or empty string if invalid
 */
export function formatDateToDDMMYYYY(dateString: string | null | undefined): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Converts a date from dd/mm/yyyy format to YYYY-MM-DD format
 * @param dateString - Date string in dd/mm/yyyy format
 * @returns Date string in YYYY-MM-DD format, or empty string if invalid
 */
export function formatDateFromDDMMYYYY(dateString: string): string {
  if (!dateString || !dateString.trim()) return ''
  
  // Remove any spaces and split by /
  const parts = dateString.trim().split('/')
  if (parts.length !== 3) return ''
  
  const day = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const year = parseInt(parts[2], 10)
  
  // Validate the date
  if (isNaN(day) || isNaN(month) || isNaN(year)) return ''
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1000 || year > 9999) return ''
  
  // Create date object to validate (handles leap years, etc.)
  const date = new Date(year, month - 1, day)
  if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
    return ''
  }
  
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Converts a Date object or date string to YYYY-MM-DD format
 * @param date - Date object or date string
 * @returns Date string in YYYY-MM-DD format, or empty string if invalid
 */
export function formatDateToYYYYMMDD(date: Date | string | null | undefined): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return ''
  
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Formats a date string for HTML date input (type="date")
 * Converts any date format to YYYY-MM-DD
 * @param dateString - Date string in any format
 * @returns Date string in YYYY-MM-DD format, or empty string if invalid
 */
export function formatDateForInput(dateString: string | null | undefined): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

