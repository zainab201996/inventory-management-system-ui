'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/lib/api-client'
import { formatDate, formatDateForInput, cn } from '@/lib/utils'
import { Rate, Item } from '@/types'
import { Search, Plus, Edit, Trash2, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function RatesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterItemId, setFilterItemId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    item_id: 0,
    rate: '',
    effective_date: '',
  })
  const [errors, setErrors] = useState<{
    item_id?: string
    rate?: string
    effective_date?: string
  }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [rates, setRates] = useState<Rate[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [rateToDelete, setRateToDelete] = useState<Rate | null>(null)

  const [selectedRate, setSelectedRate] = useState<Rate | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [isEditingInPanel, setIsEditingInPanel] = useState(false)

  const { toast } = useToast()

  const fetchRates = useCallback(
    async (itemId?: number | null) => {
      setIsLoading(true)
      try {
        const filters: { all: boolean; item_id?: number } = { all: true }
        if (itemId) filters.item_id = itemId
        const response = await apiClient.getRates(filters)
        if (response.success && response.data) {
          const ratesData = Array.isArray(response.data) ? response.data : response.data.rates || []
          setRates(ratesData)
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to fetch rates',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast]
  )

  const fetchItems = useCallback(async () => {
    try {
      const response = await apiClient.getItems({ all: true })
      if (response.success && response.data) {
        const itemsData = Array.isArray(response.data) ? response.data : response.data.items || []
        setItems(itemsData)
      }
    } catch (error: any) {
      console.error('Failed to fetch items:', error)
    }
  }, [])

  useEffect(() => {
    fetchRates(filterItemId)
    fetchItems()
  }, [fetchRates, fetchItems, filterItemId])

  const filteredRates = useMemo(() => {
    let filtered = rates
    if (searchTerm) {
      filtered = filtered.filter((rate) => {
        const item = items.find((i) => i.id === rate.item_id)
        return (
          item?.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item?.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rate.rate.toString().includes(searchTerm)
        )
      })
    }
    return filtered
  }, [rates, items, searchTerm])

  const getItemName = (itemId: number) => {
    const item = items.find((i) => i.id === itemId)
    return item ? `${item.item_code} - ${item.item_name}` : 'N/A'
  }

  const handleSelectRate = useCallback((rate: Rate) => {
    setSelectedRate(rate)
    setIsAddingNew(false)
    setIsEditingInPanel(false)
    setFormData({
      item_id: rate.item_id,
      rate: rate.rate.toString(),
      effective_date: formatDateForInput(rate.effective_date),
    })
  }, [])

  const handleAddNew = () => {
    setSelectedRate(null)
    setIsAddingNew(true)
    setIsEditingInPanel(false)
    setFormData({
      item_id: filterItemId || 0,
      rate: '',
      effective_date: formatDateForInput(new Date().toISOString()),
    })
    setErrors({})
  }

  const handleCancelAddOrEdit = () => {
    setIsAddingNew(false)
    if (selectedRate) {
      setIsEditingInPanel(false)
      setFormData({
        item_id: selectedRate.item_id,
        rate: selectedRate.rate.toString(),
        effective_date: formatDateForInput(selectedRate.effective_date),
      })
    } else {
      setFormData({ item_id: filterItemId || 0, rate: '', effective_date: '' })
    }
    setErrors({})
  }

  const handleStartEdit = () => {
    if (!selectedRate) return
    setIsEditingInPanel(true)
    setFormData({
      item_id: selectedRate.item_id,
      rate: selectedRate.rate.toString(),
      effective_date: formatDateForInput(selectedRate.effective_date),
    })
    setErrors({})
  }

  const handleEditRate = (rate: Rate) => {
    setSelectedRate(rate)
    setIsAddingNew(false)
    setIsEditingInPanel(true)
    setFormData({
      item_id: rate.item_id,
      rate: rate.rate.toString(),
      effective_date: formatDateForInput(rate.effective_date),
    })
    setErrors({})
  }

  const validateForm = () => {
    const newErrors: typeof errors = {}
    if (!formData.item_id || formData.item_id === 0) {
      newErrors.item_id = 'Item is required'
    }
    if (!formData.rate || parseFloat(formData.rate) <= 0) {
      newErrors.rate = 'Rate must be greater than 0'
    }
    if (!formData.effective_date) {
      newErrors.effective_date = 'Effective date is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      const rateData = {
        item_id: formData.item_id,
        rate: parseFloat(formData.rate),
        effective_date: formData.effective_date,
      }

      if (isAddingNew) {
        const response = await apiClient.createRate(rateData)
        if (response.success) {
          toast({ title: 'Success', description: 'Rate created successfully' })
          fetchRates(filterItemId)
          setIsAddingNew(false)
          setFormData({ item_id: filterItemId || 0, rate: '', effective_date: '' })
        }
      } else if (selectedRate) {
        const response = await apiClient.updateRate(selectedRate.id, rateData)
        if (response.success) {
          toast({ title: 'Success', description: 'Rate updated successfully' })
          fetchRates(filterItemId)
          setSelectedRate({ ...selectedRate, ...rateData })
          setIsEditingInPanel(false)
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save rate',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!rateToDelete) return
    try {
      const response = await apiClient.deleteRate(rateToDelete.id)
      if (response.success) {
        toast({ title: 'Success', description: 'Rate deleted successfully' })
        fetchRates(filterItemId)
        setIsDeleteConfirmOpen(false)
        setRateToDelete(null)
        if (selectedRate?.id === rateToDelete.id) {
          setSelectedRate(null)
          setIsEditingInPanel(false)
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete rate',
        variant: 'destructive',
      })
    }
  }

  const showDetailPanel = selectedRate || isAddingNew
  const showFormInPanel = isAddingNew || isEditingInPanel

  if (isLoading && filteredRates.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-gray-500" />
          <span className="text-gray-500 dark:text-gray-400">Loading rates...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative -mx-6 px-6" style={{ height: 'calc(100vh - 7rem)' }}>
      <div className="flex h-full gap-6 w-full min-w-[1000px]">
        {/* Left: Rates list */}
        <div className="w-70 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-800 h-full">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rates</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage item rates with effective dates</p>
              </div>
              <Button onClick={handleAddNew} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search rates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filterItemId?.toString() || 'all'}
              onValueChange={(value) => setFilterItemId(value === 'all' ? null : parseInt(value))}
            >
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder="Filter by item" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id.toString()}>
                    {item.item_code} - {item.item_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            {filteredRates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No rates found</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Get started by adding your first rate
                </p>
                <Button onClick={handleAddNew} className="mt-4" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rate
                </Button>
              </div>
            ) : (
              <div className="p-2">
                {filteredRates.map((rate) => (
                  <div
                    key={rate.id}
                    onClick={() => handleSelectRate(rate)}
                    className={cn(
                      'p-3 rounded-lg cursor-pointer transition-all mb-2 border',
                      selectedRate?.id === rate.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-sm'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {getItemName(rate.item_id)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {Number(rate.rate).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(rate.effective_date)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (selectedRate?.id === rate.id) handleStartEdit()
                            else handleEditRate(rate)
                          }}
                          className="h-6 w-6 p-0"
                          title="Edit"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRateToDelete(rate)
                            setIsDeleteConfirmOpen(true)
                          }}
                          className="h-6 w-6 p-0"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Detail / Form */}
        <div className="flex-1 min-w-0 overflow-y-auto w-full custom-scrollbar">
          {!showDetailPanel ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <p className="text-gray-500 dark:text-gray-400">Select a rate or add a new one</p>
              <Button onClick={handleAddNew} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Rate
              </Button>
            </div>
          ) : (
            <div className="space-y-6 w-full p-6">
              <div className="rounded-md border border-gray-200 dark:border-gray-800 bg-transparent shadow-none p-4 w-full">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Rate</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {isAddingNew
                        ? 'New Rate'
                        : selectedRate
                          ? `${getItemName(selectedRate.item_id)} — ${Number(selectedRate.rate).toFixed(2)}`
                          : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {showFormInPanel ? (
                      <>
                        <Button variant="outline" size="sm" onClick={handleCancelAddOrEdit}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSubmit}>
                          {isAddingNew ? 'Create' : 'Save'}
                        </Button>
                      </>
                    ) : selectedRate ? (
                      <>
                        <Button size="sm" variant="outline" onClick={handleStartEdit}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRateToDelete(selectedRate)
                            setIsDeleteConfirmOpen(true)
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-4 text-gray-900 dark:text-gray-100">
                  {showFormInPanel ? (
                    <>
                      <div>
                        <Label htmlFor="item_id" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Item
                        </Label>
                        <Select
                          value={formData.item_id.toString()}
                          onValueChange={(value) => setFormData({ ...formData, item_id: parseInt(value) })}
                          disabled={!!selectedRate}
                        >
                          <SelectTrigger className={errors.item_id ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            {items.map((item) => (
                              <SelectItem key={item.id} value={item.id.toString()}>
                                {item.item_code} - {item.item_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.item_id && (
                          <p className="text-sm text-red-500 mt-1">{errors.item_id}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="rate" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Rate
                        </Label>
                        <Input
                          id="rate"
                          type="number"
                          step="0.01"
                          min={0}
                          value={formData.rate}
                          onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                          className={errors.rate ? 'border-red-500' : ''}
                          placeholder="0.00"
                        />
                        {errors.rate && (
                          <p className="text-sm text-red-500 mt-1">{errors.rate}</p>
                        )}
                      </div>
                      <div>
                        <Label
                          htmlFor="effective_date"
                          className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Effective Date
                        </Label>
                        <Input
                          id="effective_date"
                          type="date"
                          value={formData.effective_date}
                          onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                          className={errors.effective_date ? 'border-red-500' : ''}
                        />
                        {errors.effective_date && (
                          <p className="text-sm text-red-500 mt-1">{errors.effective_date}</p>
                        )}
                      </div>
                    </>
                  ) : selectedRate ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Item</Label>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                          {getItemName(selectedRate.item_id)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Rate</Label>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                          {Number(selectedRate.rate).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Effective Date
                        </Label>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                          {formatDate(selectedRate.effective_date)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Created At</Label>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                          {formatDate(selectedRate.created_at)}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Rate</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this rate? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
