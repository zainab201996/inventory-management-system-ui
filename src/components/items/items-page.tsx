'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { apiClient } from '@/lib/api-client'
import { formatDate, cn } from '@/lib/utils'
import { Item, Store, CreateOpeningStockData } from '@/types'
import { Search, Plus, Edit, Trash2, Loader2, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function ItemsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({ item_name: '', item_category: '' })
  const [errors, setErrors] = useState<{ item_name?: string; item_category?: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null)

  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [isEditingInPanel, setIsEditingInPanel] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'openingStock'>('details')
  const [openingStocks, setOpeningStocks] = useState<CreateOpeningStockData[]>([])

  const { toast } = useToast()

  const fetchItems = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.getItems({ all: true })
      if (response.success && response.data) {
        const itemsData = Array.isArray(response.data) ? response.data : response.data.items || []
        setItems(itemsData)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch items',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const fetchStores = useCallback(async () => {
    try {
      const response = await apiClient.getStores({ all: true })
      if (response.success && response.data) {
        const storesData = Array.isArray(response.data) ? response.data : response.data.stores || []
        setStores(storesData)
      }
    } catch (error: any) {
      console.error('Failed to fetch stores:', error)
    }
  }, [])

  useEffect(() => {
    fetchItems()
    fetchStores()
  }, [fetchItems, fetchStores])

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items
    return items.filter(item =>
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_category.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [items, searchTerm])

  const handleSelectItem = useCallback(async (item: Item) => {
    setSelectedItem(item)
    setIsAddingNew(false)
    setIsEditingInPanel(false)
    setActiveTab('details')
    try {
      const response = await apiClient.getItem(item.id, true)
      if (response.success && response.data) setSelectedItem(response.data)
    } catch {
      // keep list item
    }
  }, [])

  const handleAddNew = () => {
    setSelectedItem(null)
    setIsAddingNew(true)
    setIsEditingInPanel(false)
    setFormData({ item_name: '', item_category: '' })
    setOpeningStocks([])
    setErrors({})
    setActiveTab('details')
  }

  const handleCancelAddOrEdit = () => {
    setIsAddingNew(false)
    if (selectedItem) {
      setIsEditingInPanel(false)
      setFormData({ item_name: selectedItem.item_name, item_category: selectedItem.item_category })
      setOpeningStocks(
        (selectedItem.opening_stocks || []).map((os) => ({ store_id: os.store_id, opening_qty: os.opening_qty }))
      )
    } else {
      setFormData({ item_name: '', item_category: '' })
      setOpeningStocks([])
    }
    setErrors({})
  }

  const handleStartEdit = () => {
    if (!selectedItem) return
    setIsEditingInPanel(true)
    setFormData({ item_name: selectedItem.item_name, item_category: selectedItem.item_category })
    setOpeningStocks(
      (selectedItem.opening_stocks || []).map((os) => ({ store_id: os.store_id, opening_qty: os.opening_qty }))
    )
    setErrors({})
  }

  const validateForm = () => {
    const newErrors: typeof errors = {}
    if (!formData.item_name.trim()) newErrors.item_name = 'Item name is required'
    if (!formData.item_category.trim()) newErrors.item_category = 'Item category is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    try {
      const itemData = {
        ...formData,
        opening_stocks: openingStocks.length > 0 ? openingStocks : undefined,
      }
      if (isAddingNew) {
        const response = await apiClient.createItem(itemData)
        if (response.success) {
          toast({ title: 'Success', description: 'Item created successfully' })
          fetchItems()
          setIsAddingNew(false)
          setFormData({ item_name: '', item_category: '' })
          setOpeningStocks([])
        }
      } else if (selectedItem) {
        const response = await apiClient.updateItem(selectedItem.id, itemData)
        if (response.success) {
          toast({ title: 'Success', description: 'Item updated successfully' })
          fetchItems()
          const updated = await apiClient.getItem(selectedItem.id, true)
          if (updated.success && updated.data) setSelectedItem(updated.data)
          setIsEditingInPanel(false)
        }
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save item', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!itemToDelete) return
    try {
      const response = await apiClient.deleteItem(itemToDelete.id)
      if (response.success) {
        toast({ title: 'Success', description: 'Item deleted successfully' })
        fetchItems()
        setIsDeleteConfirmOpen(false)
        setItemToDelete(null)
        if (selectedItem?.id === itemToDelete.id) {
          setSelectedItem(null)
          setIsEditingInPanel(false)
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete item',
        variant: 'destructive',
      })
    }
  }

  const handleAddOpeningStock = () => {
    setOpeningStocks([...openingStocks, { store_id: 0, opening_qty: 0 }])
  }

  const handleRemoveOpeningStock = (index: number) => {
    setOpeningStocks(openingStocks.filter((_, i) => i !== index))
  }

  const handleOpeningStockChange = (index: number, field: 'store_id' | 'opening_qty', value: number) => {
    const updated = [...openingStocks]
    updated[index] = { ...updated[index], [field]: value }
    setOpeningStocks(updated)
  }

  const showDetailPanel = selectedItem || isAddingNew
  const showFormInPanel = isAddingNew || isEditingInPanel

  if (isLoading && filteredItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-gray-500" />
          <span className="text-gray-500 dark:text-gray-400">Loading items...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative -mx-6 px-6" style={{ height: 'calc(100vh - 7rem)' }}>
      <div className="flex h-full gap-6 w-full min-w-[1000px]">
        {/* Left: Items list */}
        <div className="w-70 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-800 h-full">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Items</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage item profiles with opening stock</p>
              </div>
              <Button onClick={handleAddNew} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No items found</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Get started by adding your first item
                </p>
                <Button onClick={handleAddNew} className="mt-4" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            ) : (
              <div className="p-2">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className={cn(
                      'p-3 rounded-lg cursor-pointer transition-all mb-2 border',
                      selectedItem?.id === item.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-sm'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">{item.item_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.item_code}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{item.item_category}</div>
                      </div>
                      <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (selectedItem?.id === item.id) handleStartEdit()
                            else handleSelectItem(item).then(() => handleStartEdit())
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
                            setItemToDelete(item)
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
              <p className="text-gray-500 dark:text-gray-400">Select an item or add a new one</p>
              <Button onClick={handleAddNew} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          ) : (
            <div className="space-y-6 w-full p-6">
              <div className="rounded-md border border-gray-200 dark:border-gray-800 bg-transparent shadow-none p-4 w-full">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Item</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {isAddingNew ? 'New Item' : selectedItem?.item_name}
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
                    ) : selectedItem ? (
                      <>
                        <Button size="sm" variant="outline" onClick={handleStartEdit}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setItemToDelete(selectedItem)
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

                <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900 mb-6">
                  <button
                    type="button"
                    onClick={() => setActiveTab('details')}
                    className={`px-4 py-2 font-medium w-full rounded-md text-sm transition-colors ${
                      activeTab === 'details'
                        ? 'shadow-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Item Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('openingStock')}
                    className={`px-4 py-2 font-medium w-full rounded-md text-sm transition-colors ${
                      activeTab === 'openingStock'
                        ? 'shadow-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Opening Stock ({showFormInPanel ? openingStocks.length : selectedItem?.opening_stocks?.length || 0})
                  </button>
                </div>

                {activeTab === 'details' && (
                  <div className="space-y-4 text-gray-900 dark:text-gray-100">
                    {showFormInPanel ? (
                      <>
                        <div>
                          <Label htmlFor="item_name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Item Name
                          </Label>
                          <Input
                            id="item_name"
                            value={formData.item_name}
                            onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                            className={errors.item_name ? 'border-red-500' : ''}
                          />
                          {errors.item_name && <p className="text-sm text-red-500 mt-1">{errors.item_name}</p>}
                        </div>
                        <div>
                          <Label htmlFor="item_category" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Item Category
                          </Label>
                          <Input
                            id="item_category"
                            value={formData.item_category}
                            onChange={(e) => setFormData({ ...formData, item_category: e.target.value })}
                            className={errors.item_category ? 'border-red-500' : ''}
                          />
                          {errors.item_category && (
                            <p className="text-sm text-red-500 mt-1">{errors.item_category}</p>
                          )}
                        </div>
                      </>
                    ) : selectedItem ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Item Code</Label>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                            {selectedItem.item_code}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Item Name</Label>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                            {selectedItem.item_name}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</Label>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                            {selectedItem.item_category}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Created At</Label>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                            {formatDate(selectedItem.created_at)}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {activeTab === 'openingStock' && (
                  <div className="space-y-4 text-gray-900 dark:text-gray-100">
                    {showFormInPanel ? (
                      <>
                        <div className="flex justify-between items-center">
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Opening Stock Information
                          </Label>
                          <Button type="button" variant="outline" size="sm" onClick={handleAddOpeningStock}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Store Stock
                          </Button>
                        </div>
                        {openingStocks.length === 0 ? (
                          <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
                            No opening stock entries. Click &quot;Add Store Stock&quot; to add entries.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {openingStocks.map((stock, index) => (
                              <div
                                key={index}
                                className="flex gap-2 items-start p-3 border border-gray-200 dark:border-gray-700 rounded-md"
                              >
                                <div className="flex-1">
                                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Store</Label>
                                  <Select
                                    value={stock.store_id.toString()}
                                    onValueChange={(v) => handleOpeningStockChange(index, 'store_id', parseInt(v))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select store" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {stores.map((store) => (
                                        <SelectItem key={store.id} value={store.id.toString()}>
                                          {store.store_code} - {store.store_name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex-1">
                                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Opening Quantity
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={stock.opening_qty || ''}
                                    onChange={(e) =>
                                      handleOpeningStockChange(index, 'opening_qty', parseFloat(e.target.value) || 0)
                                    }
                                    placeholder="0"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveOpeningStock(index)}
                                  className="mt-6"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : selectedItem ? (
                      !selectedItem.opening_stocks || selectedItem.opening_stocks.length === 0 ? (
                        <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
                          No opening stock entries for this item.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Store Code
                              </TableHead>
                              <TableHead className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Store Name
                              </TableHead>
                              <TableHead className="text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                                Opening Quantity
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedItem.opening_stocks.map((stock) => (
                              <TableRow key={stock.id}>
                                <TableCell className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {stock.store_code ?? stock.store?.store_code ?? 'N/A'}
                                </TableCell>
                                <TableCell className="text-sm text-gray-900 dark:text-gray-100">
                                  {stock.store_name ?? stock.store?.store_name ?? 'N/A'}
                                </TableCell>
                                <TableCell className="text-right text-sm text-gray-900 dark:text-gray-100">
                                  {stock.opening_qty}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {itemToDelete?.item_name}? This action cannot be undone.
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
