// Shared filter utilities for common entity types (Roles, Departments, Regions, etc.)

import { FilterField, FilterOperator } from '@/components/ui/advanced-filter-dialog'

export const commonFilterFields: FilterField[] = [
  { value: 'name', label: 'Name', type: 'text' },
  { value: 'description', label: 'Description', type: 'text' },
  { value: 'created_at', label: 'Created Date', type: 'date' }
]

export const getCommonOperatorsForField = (field: string): FilterOperator[] => {
  switch (field) {
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

export const applyCommonFilterCondition = (fieldValue: any, operator: string, filterValue: any): boolean => {
  // For operators that require values, reject empty values
  if ((!filterValue || filterValue.toString().trim() === '') && operator !== 'isEmpty' && operator !== 'isNotEmpty') {
    return false
  }

  switch (operator) {
    case 'contains':
      return fieldValue.toString().toLowerCase().includes(filterValue.toString().toLowerCase())
    case 'doesNotContain':
      return !fieldValue.toString().toLowerCase().includes(filterValue.toString().toLowerCase())
    case 'equals':
      return fieldValue.toString().toLowerCase() === filterValue.toString().toLowerCase()
    case 'doesNotEqual':
      return fieldValue.toString().toLowerCase() !== filterValue.toString().toLowerCase()
    case 'startsWith':
      return fieldValue.toString().toLowerCase().startsWith(filterValue.toString().toLowerCase())
    case 'endsWith':
      return fieldValue.toString().toLowerCase().endsWith(filterValue.toString().toLowerCase())
    case 'isAnyOf':
      const values = filterValue.toString().split(',').map((v: string) => v.trim().toLowerCase())
      return values.includes(fieldValue.toString().toLowerCase())
    case 'isEmpty':
      return !fieldValue || fieldValue.toString().trim() === ''
    case 'isNotEmpty':
      return fieldValue && fieldValue.toString().trim() !== ''
    case 'is':
      return fieldValue === filterValue
    case 'isNot':
      return fieldValue !== filterValue
    case 'after':
      return new Date(fieldValue) > new Date(filterValue)
    case 'onOrAfter':
      return new Date(fieldValue) >= new Date(filterValue)
    case 'before':
      return new Date(fieldValue) < new Date(filterValue)
    case 'onOrBefore':
      return new Date(fieldValue) <= new Date(filterValue)
    default:
      return true
  }
}

export const getOperatorDisplay = (operator: string): string => {
  const map: { [key: string]: string } = {
    'contains': 'contains',
    'doesNotContain': 'does not contain',
    'equals': 'equals',
    'doesNotEqual': 'does not equal',
    'startsWith': 'starts with',
    'endsWith': 'ends with',
    'isAnyOf': 'is any of',
    'isEmpty': 'is empty',
    'isNotEmpty': 'is not empty',
    'is': 'is',
    'isNot': 'is not',
    'after': 'after',
    'onOrAfter': 'on or after',
    'before': 'before',
    'onOrBefore': 'on or before'
  }
  return map[operator] || operator
}

