'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Filter, X } from 'lucide-react'

export interface FilterItem {
  id: number
  field: string
  operator: string
  value: any
}

export interface FilterModel {
  items: FilterItem[]
  logicOperator: 'and' | 'or'
}

export interface FilterField {
  value: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'status'
  options?: Array<{ value: string; label: string }>
}

export interface FilterOperator {
  value: string
  label: string
  requiresValue: boolean
}

export interface AdvancedFilterDialogProps {
  isOpen: boolean
  onClose: () => void
  onApplyFilters: (filterModel: FilterModel) => void
  filterModel: FilterModel
  onFilterModelChange: (filterModel: FilterModel) => void
  fields: FilterField[]
  getOperatorsForField: (field: string) => FilterOperator[]
  getValueInput: (field: FilterField, operator: string, value: any, onChange: (value: any) => void) => React.ReactNode
}

export function AdvancedFilterDialog({
  isOpen,
  onClose,
  onApplyFilters,
  filterModel,
  onFilterModelChange,
  fields,
  getOperatorsForField,
  getValueInput
}: AdvancedFilterDialogProps) {
  const addFilter = () => {
    const newFilter: FilterItem = {
      id: Date.now(),
      field: fields[0]?.value || '',
      operator: 'contains',
      value: ''
    }
    
    onFilterModelChange({
      ...filterModel,
      items: [...filterModel.items, newFilter]
    })
  }

  const removeFilter = (filterId: number) => {
    onFilterModelChange({
      ...filterModel,
      items: filterModel.items.filter(item => item.id !== filterId)
    })
  }

  const updateFilter = (filterId: number, updates: Partial<FilterItem>) => {
    onFilterModelChange({
      ...filterModel,
      items: filterModel.items.map(item =>
        item.id === filterId ? { ...item, ...updates } : item
      )
    })
  }

  const handleApplyFilters = () => {
    // Filter out items with empty values (except for operators that don't require values)
    const validItems = filterModel.items.filter(item => {
      const operators = getOperatorsForField(item.field)
      const operator = operators.find(op => op.value === item.operator)
      
      // If operator doesn't require a value (like isEmpty/isNotEmpty), include it
      if (operator && !operator.requiresValue) {
        return true
      }
      
      // For operators that require values, check if value is not empty
      if (item.value === null || item.value === undefined) {
        return false
      }
      
      // Check if value is empty string or whitespace
      const valueStr = String(item.value).trim()
      if (valueStr === '') {
        return false
      }
      
      // For isAnyOf, check if at least one value is provided
      if (item.operator === 'isAnyOf') {
        const values = valueStr.split(',').map(v => v.trim()).filter(v => v !== '')
        return values.length > 0
      }
      
      return true
    })
    
    // Only apply filters if there are valid items
    const validFilterModel = {
      ...filterModel,
      items: validItems
    }
    
    onApplyFilters(validFilterModel)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle>Advanced Filters</DialogTitle>
          <DialogDescription>
            Set up advanced filters with column, operator, and value combinations
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* Logic Operator */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-900 dark:text-white">Logic Operator:</label>
            <select
              value={filterModel.logicOperator}
              onChange={(e) => onFilterModelChange({
                ...filterModel,
                logicOperator: e.target.value as 'and' | 'or'
              })}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white h-9"
            >
              <option value="and">AND (all conditions must be true)</option>
              <option value="or">OR (any condition can be true)</option>
            </select>
          </div>

          {/* Filter Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Filter Conditions</h3>
              <Button onClick={addFilter} size="sm">
                Add Filter
              </Button>
            </div>

            {filterModel.items.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Filter className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p>No filters applied. Click "Add Filter" to create a new condition.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filterModel.items.map((item, index) => {
                  const field = fields.find(f => f.value === item.field) || fields[0]
                  const operators = getOperatorsForField(item.field)
                  
                  return (
                    <div key={item.id} className="flex items-end space-x-4 p-4 border border-gray-200 rounded-lg bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                      {/* Column Selection */}
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Column</label>
                        <select
                          value={item.field}
                          onChange={(e) => updateFilter(item.id, { field: e.target.value, operator: 'contains', value: '' })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white h-9"
                        >
                          {fields.map(field => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Operator Selection */}
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Operator</label>
                        <select
                          value={item.operator}
                          onChange={(e) => updateFilter(item.id, { operator: e.target.value, value: '' })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white h-9"
                        >
                          {operators.map(operator => (
                            <option key={operator.value} value={operator.value}>
                              {operator.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Value Input */}
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Value</label>
                        {getValueInput(field, item.operator, item.value, (value) => updateFilter(item.id, { value }))}
                      </div>

                      {/* Remove Button */}
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFilter(item.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20 h-9"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200 dark:border-gray-800">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


