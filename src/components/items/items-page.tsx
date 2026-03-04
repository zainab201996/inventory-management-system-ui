'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { apiClient } from '@/lib/api-client'
import { formatDate } from '@/lib/utils'
import { Item, Store, OpeningStock, CreateOpeningStockData } from '@/types'
import { Search, Plus, Eye, Edit, Trash2, Loader2, X } from 'lucide-react'
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

export function ItemsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [formData, setFormData] = useState({ 
    item_name: '', 
    item_category: '' 
  })
  const [errors, setErrors] = useState<{ 
    item_name?: string; 
    item_category?: string;
    opening_stocks?: string;
  }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null)
  
  // Master-Detail state
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
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

  const handleOpenDialog = async (item?: Item) => {
    setErrors({})
    setActiveTab('details')

    if (item) {
      // Start with the lightweight list item data so the dialog feels snappy
      setEditingItem(item)
      setFormData({
        item_name: item.item_name,
        item_category: item.item_category,
      })

      // Fallback to any opening stocks already present on the list item
      if (item.opening_stocks && item.opening_stocks.length > 0) {
        setOpeningStocks(
          item.opening_stocks.map((os) => ({
            store_id: os.store_id,
            opening_qty: os.opening_qty,
          })),
        )
      } else {
        setOpeningStocks([])
      }

      setIsDialogOpen(true)

      // Then hydrate with the authoritative item record that always includes opening stocks
      try {
        const response = await apiClient.getItem(item.id, true)
        if (response.success && response.data) {
          const fullItem = response.data
          setEditingItem(fullItem)
          setFormData({
            item_name: fullItem.item_name,
            item_category: fullItem.item_category,
          })

          if (fullItem.opening_stocks && fullItem.opening_stocks.length > 0) {
            setOpeningStocks(
              fullItem.opening_stocks.map((os) => ({
                store_id: os.store_id,
                opening_qty: os.opening_qty,
              })),
            )
          } else {
            setOpeningStocks([])
          }
        }
      } catch {
        // If the detailed fetch fails, we keep whatever data we already showed
      }
    } else {
      setEditingItem(null)
      setFormData({ item_name: '', item_category: '' })
      setOpeningStocks([])
      setIsDialogOpen(true)
    }
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingItem(null)
    setFormData({ item_name: '', item_category: '' })
    setOpeningStocks([])
    setErrors({})
    setActiveTab('details')
  }

  const validateForm = () => {
    const newErrors: typeof errors = {}
    if (!formData.item_name.trim()) {
      newErrors.item_name = 'Item name is required'
    }
    if (!formData.item_category.trim()) {
      newErrors.item_category = 'Item category is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      const itemData = {
        ...formData,
        opening_stocks: openingStocks.length > 0 ? openingStocks : undefined
      }

      if (editingItem) {
        const response = await apiClient.updateItem(editingItem.id, itemData)
        if (response.success) {
          toast({ title: 'Success', description: 'Item updated successfully' })
          fetchItems()
          handleCloseDialog()
        }
      } else {
        const response = await apiClient.createItem(itemData)
        if (response.success) {
          toast({ title: 'Success', description: 'Item created successfully' })
          fetchItems()
          handleCloseDialog()
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save item',
        variant: 'destructive',
      })
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
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete item',
        variant: 'destructive',
      })
    }
  }

  const handleOpenDetailDialog = async (item: Item) => {
    try {
      // Fetch item with opening stocks included
      const response = await apiClient.getItem(item.id, true)
      if (response.success && response.data) {
        setSelectedItem(response.data)
        setIsDetailDialogOpen(true)
        setActiveTab('details')
      } else {
        setSelectedItem(item)
        setIsDetailDialogOpen(true)
        setActiveTab('details')
      }
    } catch (error) {
      // Fallback to item without opening stocks
      setSelectedItem(item)
      setIsDetailDialogOpen(true)
      setActiveTab('details')
    }
  }

  const handleCloseDetailDialog = () => {
    setIsDetailDialogOpen(false)
    setSelectedItem(null)
    setActiveTab('details')
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

  const getStoreName = (storeId: number) => {
    const store = stores.find(s => s.id === storeId)
    return store ? `${store.store_code} - ${store.store_name}` : 'Select Store'
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <CardDescription>Manage item profiles with opening stock information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No items found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.item_code}</TableCell>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell>{item.item_category}</TableCell>
                      <TableCell>{formatDate(item.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetailDialog(item)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setItemToDelete(item)
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Create Item'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update item information and opening stock' : 'Add a new item to the system'}
            </DialogDescription>
          </DialogHeader>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900 mb-6">
            <button
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
              onClick={() => setActiveTab('openingStock')}
              className={`px-4 py-2 font-medium w-full rounded-md text-sm transition-colors ${
                activeTab === 'openingStock'
                  ? 'shadow-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Opening Stock ({openingStocks.length})
            </button>
          </div>

          {activeTab === 'details' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="item_name">Item Name</Label>
                <Input
                  id="item_name"
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  className={errors.item_name ? 'border-red-500' : ''}
                />
                {errors.item_name && (
                  <p className="text-sm text-red-500 mt-1">{errors.item_name}</p>
                )}
              </div>
              <div>
                <Label htmlFor="item_category">Item Category</Label>
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
            </div>
          )}

          {activeTab === 'openingStock' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Opening Stock Information</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddOpeningStock}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Store Stock
                </Button>
              </div>
              
              {openingStocks.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border border-dashed rounded-md">
                  No opening stock entries. Click "Add Store Stock" to add entries.
                </div>
              ) : (
                <div className="space-y-3">
                  {openingStocks.map((stock, index) => (
                    <div key={index} className="flex gap-2 items-start p-3 border rounded-md">
                      <div className="flex-1">
                        <Label className="text-xs text-gray-500">Store</Label>
                        <Select
                          value={stock.store_id.toString()}
                          onValueChange={(value) => handleOpeningStockChange(index, 'store_id', parseInt(value))}
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
                        <Label className="text-xs text-gray-500">Opening Quantity</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={stock.opening_qty || ''}
                          onChange={(e) => handleOpeningStockChange(index, 'opening_qty', parseFloat(e.target.value) || 0)}
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
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Item Details - {selectedItem?.item_name}</DialogTitle>
            <DialogDescription>
              View and manage item information and opening stock
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <>
              {/* Tabs Navigation */}
              <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900 mb-6">
                <button
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
                  onClick={() => setActiveTab('openingStock')}
                  className={`px-4 py-2 font-medium w-full rounded-md text-sm transition-colors ${
                    activeTab === 'openingStock'
                      ? 'shadow-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Opening Stock ({selectedItem.opening_stocks?.length || 0})
                </button>
              </div>

              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-500">Item Code</Label>
                      <p className="font-medium">{selectedItem.item_code}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">Item Name</Label>
                      <p className="font-medium">{selectedItem.item_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">Category</Label>
                      <p className="font-medium">{selectedItem.item_category}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">Created At</Label>
                      <p className="font-medium">{formatDate(selectedItem.created_at)}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'openingStock' && (
                <div className="space-y-4">
                  {!selectedItem.opening_stocks || selectedItem.opening_stocks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 border border-dashed rounded-md">
                      No opening stock entries for this item.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Store Code</TableHead>
                          <TableHead>Store Name</TableHead>
                          <TableHead className="text-right">Opening Quantity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedItem.opening_stocks.map((stock) => (
                          <TableRow key={stock.id}>
                            <TableCell className="font-medium">{stock.store?.store_code || 'N/A'}</TableCell>
                            <TableCell>{stock.store?.store_name || 'N/A'}</TableCell>
                            <TableCell className="text-right">{stock.opening_qty}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDetailDialog}>
              Close
            </Button>
            <Button onClick={() => {
              handleCloseDetailDialog()
              if (selectedItem) handleOpenDialog(selectedItem)
            }}>
              Edit Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
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
