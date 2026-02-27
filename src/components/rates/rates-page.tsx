'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { apiClient } from '@/lib/api-client'
import { formatDate, formatDateForInput } from '@/lib/utils'
import { Rate, Item } from '@/types'
import { Search, Plus, Edit, Trash2, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function RatesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRate, setEditingRate] = useState<Rate | null>(null)
  const [formData, setFormData] = useState({ 
    item_id: 0,
    rate: '',
    effective_date: ''
  })
  const [errors, setErrors] = useState<{ 
    item_id?: string; 
    rate?: string; 
    effective_date?: string;
  }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [rates, setRates] = useState<Rate[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [rateToDelete, setRateToDelete] = useState<Rate | null>(null)
  const { toast } = useToast()

  const fetchRates = useCallback(async (itemId?: number) => {
    setIsLoading(true)
    try {
      const filters: any = { all: true }
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
  }, [toast])

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
    fetchRates(selectedItemId || undefined)
    fetchItems()
  }, [fetchRates, fetchItems, selectedItemId])

  const filteredRates = useMemo(() => {
    let filtered = rates
    
    if (searchTerm) {
      filtered = filtered.filter(rate => {
        const item = items.find(i => i.id === rate.item_id)
        return (
          item?.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item?.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rate.rate.toString().includes(searchTerm)
        )
      })
    }
    
    return filtered
  }, [rates, items, searchTerm])

  const handleOpenDialog = (rate?: Rate) => {
    if (rate) {
      setEditingRate(rate)
      setFormData({ 
        item_id: rate.item_id,
        rate: rate.rate.toString(),
        effective_date: formatDateForInput(rate.effective_date)
      })
    } else {
      setEditingRate(null)
      setFormData({ 
        item_id: selectedItemId || 0,
        rate: '',
        effective_date: formatDateForInput(new Date().toISOString())
      })
    }
    setErrors({})
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingRate(null)
    setFormData({ item_id: 0, rate: '', effective_date: '' })
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
        effective_date: formData.effective_date
      }

      if (editingRate) {
        const response = await apiClient.updateRate(editingRate.id, rateData)
        if (response.success) {
          toast({ title: 'Success', description: 'Rate updated successfully' })
          fetchRates(selectedItemId || undefined)
          handleCloseDialog()
        }
      } else {
        const response = await apiClient.createRate(rateData)
        if (response.success) {
          toast({ title: 'Success', description: 'Rate created successfully' })
          fetchRates(selectedItemId || undefined)
          handleCloseDialog()
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
        fetchRates(selectedItemId || undefined)
        setIsDeleteConfirmOpen(false)
        setRateToDelete(null)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete rate',
        variant: 'destructive',
      })
    }
  }

  const getItemName = (itemId: number) => {
    const item = items.find(i => i.id === itemId)
    return item ? `${item.item_code} - ${item.item_name}` : 'N/A'
  }

  const getCurrentRate = async (itemId: number) => {
    try {
      const response = await apiClient.getCurrentRate(itemId)
      if (response.success && response.data) {
        return response.data.rate
      }
    } catch (error) {
      console.error('Failed to get current rate:', error)
    }
    return null
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rates</CardTitle>
          <CardDescription>Manage item rates with effective dates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search rates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={selectedItemId?.toString() || 'all'}
                onValueChange={(value) => {
                  setSelectedItemId(value === 'all' ? null : parseInt(value))
                }}
              >
                <SelectTrigger className="w-[200px]">
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
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Rate
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No rates found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell className="font-medium">{getItemName(rate.item_id)}</TableCell>
                      <TableCell>{Number(rate.rate).toFixed(2)}</TableCell>
                      <TableCell>{formatDate(rate.effective_date)}</TableCell>
                      <TableCell>{formatDate(rate.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(rate)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRateToDelete(rate)
                              setIsDeleteConfirmOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRate ? 'Edit Rate' : 'Create Rate'}</DialogTitle>
            <DialogDescription>
              {editingRate ? 'Update rate information' : 'Add a new rate for an item'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="item_id">Item</Label>
              <Select
                value={formData.item_id.toString()}
                onValueChange={(value) => setFormData({ ...formData, item_id: parseInt(value) })}
                disabled={!!editingRate}
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
              <Label htmlFor="rate">Rate</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                min="0"
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
              <Label htmlFor="effective_date">Effective Date</Label>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingRate ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
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
