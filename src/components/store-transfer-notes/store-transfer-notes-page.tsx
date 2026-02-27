'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { apiClient } from '@/lib/api-client'
import { formatDate, formatDateForInput } from '@/lib/utils'
import { StoreTransferNote, Store, Item, CreateStoreTransferNoteDetailData } from '@/types'
import { Search, Plus, Edit, Trash2, Loader2, X, Eye } from 'lucide-react'
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

export function StoreTransferNotesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [editingTransferNote, setEditingTransferNote] = useState<StoreTransferNote | null>(null)
  const [viewingTransferNote, setViewingTransferNote] = useState<StoreTransferNote | null>(null)
  const [formData, setFormData] = useState({ 
    v_no: '',
    date: formatDateForInput(new Date().toISOString()),
    ref_no: '',
    from_store_id: 0,
    to_store_id: 0,
    order_no: ''
  })
  const [details, setDetails] = useState<CreateStoreTransferNoteDetailData[]>([])
  const [errors, setErrors] = useState<{ 
    v_no?: string;
    date?: string;
    from_store_id?: string;
    to_store_id?: string;
    details?: string;
  }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [transferNotes, setTransferNotes] = useState<StoreTransferNote[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [transferNoteToDelete, setTransferNoteToDelete] = useState<StoreTransferNote | null>(null)
  const { toast } = useToast()

  const fetchTransferNotes = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.getStoreTransferNotes({ all: true })
      if (response.success && response.data) {
        const notesData = Array.isArray(response.data) ? response.data : response.data.transferNotes || []
        setTransferNotes(notesData)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch transfer notes',
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
    fetchTransferNotes()
    fetchStores()
    fetchItems()
  }, [fetchTransferNotes, fetchStores, fetchItems])

  const filteredTransferNotes = useMemo(() => {
    if (!searchTerm) return transferNotes
    return transferNotes.filter(note =>
      note.v_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.ref_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.order_no?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [transferNotes, searchTerm])

  const handleOpenDialog = (transferNote?: StoreTransferNote) => {
    if (transferNote) {
      setEditingTransferNote(transferNote)
      setFormData({
        v_no: transferNote.v_no,
        date: formatDateForInput(transferNote.date),
        ref_no: transferNote.ref_no || '',
        from_store_id: transferNote.from_store_id,
        to_store_id: transferNote.to_store_id,
        order_no: transferNote.order_no || ''
      })
      if (transferNote.details && transferNote.details.length > 0) {
        setDetails(transferNote.details.map(d => ({
          item_id: d.item_id,
          item_code: d.item_code,
          item_name: d.item_name,
          qty: d.qty,
          ref: d.ref || null
        })))
      } else {
        setDetails([])
      }
    } else {
      setEditingTransferNote(null)
      setFormData({
        v_no: '',
        date: formatDateForInput(new Date().toISOString()),
        ref_no: '',
        from_store_id: 0,
        to_store_id: 0,
        order_no: ''
      })
      setDetails([])
    }
    setErrors({})
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingTransferNote(null)
    setFormData({
      v_no: '',
      date: formatDateForInput(new Date().toISOString()),
      ref_no: '',
      from_store_id: 0,
      to_store_id: 0,
      order_no: ''
    })
    setDetails([])
    setErrors({})
  }

  const handleViewDialog = async (transferNote: StoreTransferNote) => {
    try {
      // Fetch full details
      const response = await apiClient.getStoreTransferNote(transferNote.id)
      if (response.success && response.data) {
        setViewingTransferNote(response.data)
        setIsViewDialogOpen(true)
      } else {
        setViewingTransferNote(transferNote)
        setIsViewDialogOpen(true)
      }
    } catch (error) {
      setViewingTransferNote(transferNote)
      setIsViewDialogOpen(true)
    }
  }

  const validateForm = () => {
    const newErrors: typeof errors = {}
    if (!formData.v_no.trim()) {
      newErrors.v_no = 'Voucher number is required'
    }
    if (!formData.date) {
      newErrors.date = 'Date is required'
    }
    if (!formData.from_store_id || formData.from_store_id === 0) {
      newErrors.from_store_id = 'From store is required'
    }
    if (!formData.to_store_id || formData.to_store_id === 0) {
      newErrors.to_store_id = 'To store is required'
    }
    if (formData.from_store_id === formData.to_store_id) {
      newErrors.to_store_id = 'From store and To store must be different'
    }
    if (details.length === 0) {
      newErrors.details = 'At least one detail entry is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      const transferNoteData = {
        ...formData,
        ref_no: formData.ref_no || null,
        order_no: formData.order_no || null,
        details: details
      }

      if (editingTransferNote) {
        const response = await apiClient.updateStoreTransferNote(editingTransferNote.id, transferNoteData)
        if (response.success) {
          toast({ title: 'Success', description: 'Transfer note updated successfully' })
          fetchTransferNotes()
          handleCloseDialog()
        }
      } else {
        const response = await apiClient.createStoreTransferNote(transferNoteData)
        if (response.success) {
          toast({ title: 'Success', description: 'Transfer note created successfully' })
          fetchTransferNotes()
          handleCloseDialog()
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save transfer note',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!transferNoteToDelete) return
    try {
      const response = await apiClient.deleteStoreTransferNote(transferNoteToDelete.id)
      if (response.success) {
        toast({ title: 'Success', description: 'Transfer note deleted successfully' })
        fetchTransferNotes()
        setIsDeleteConfirmOpen(false)
        setTransferNoteToDelete(null)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete transfer note',
        variant: 'destructive',
      })
    }
  }

  const handleAddDetail = () => {
    setDetails([...details, { item_id: 0, item_code: '', item_name: '', qty: 0, ref: null }])
  }

  const handleRemoveDetail = (index: number) => {
    setDetails(details.filter((_, i) => i !== index))
  }

  const handleDetailChange = (index: number, field: keyof CreateStoreTransferNoteDetailData, value: any) => {
    const updated = [...details]
    if (field === 'item_id') {
      const item = items.find(i => i.id === value)
      updated[index] = {
        ...updated[index],
        item_id: value,
        item_code: item?.item_code || '',
        item_name: item?.item_name || ''
      }
    } else {
      updated[index] = { ...updated[index], [field]: value }
    }
    setDetails(updated)
  }

  const getStoreName = (storeId: number) => {
    const store = stores.find(s => s.id === storeId)
    return store ? `${store.store_code} - ${store.store_name}` : 'N/A'
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Store Transfer Notes</CardTitle>
          <CardDescription>Manage store-to-store stock transfers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search transfer notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Transfer Note
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
                  <TableHead>Voucher No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>From Store</TableHead>
                  <TableHead>To Store</TableHead>
                  <TableHead>Ref No</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransferNotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No transfer notes found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransferNotes.map((note) => (
                    <TableRow key={note.id}>
                      <TableCell className="font-medium">{note.v_no}</TableCell>
                      <TableCell>{formatDate(note.date)}</TableCell>
                      <TableCell>{getStoreName(note.from_store_id)}</TableCell>
                      <TableCell>{getStoreName(note.to_store_id)}</TableCell>
                      <TableCell>{note.ref_no || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDialog(note)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(note)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTransferNoteToDelete(note)
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTransferNote ? 'Edit Transfer Note' : 'Create Transfer Note'}</DialogTitle>
            <DialogDescription>
              {editingTransferNote ? 'Update transfer note information' : 'Create a new store-to-store transfer'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Master Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="v_no">Voucher Number</Label>
                <Input
                  id="v_no"
                  value={formData.v_no}
                  onChange={(e) => setFormData({ ...formData, v_no: e.target.value })}
                  className={errors.v_no ? 'border-red-500' : ''}
                />
                {errors.v_no && (
                  <p className="text-sm text-red-500 mt-1">{errors.v_no}</p>
                )}
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className={errors.date ? 'border-red-500' : ''}
                />
                {errors.date && (
                  <p className="text-sm text-red-500 mt-1">{errors.date}</p>
                )}
              </div>
              <div>
                <Label htmlFor="from_store_id">From Store</Label>
                <Select
                  value={formData.from_store_id.toString()}
                  onValueChange={(value) => setFormData({ ...formData, from_store_id: parseInt(value) })}
                >
                  <SelectTrigger className={errors.from_store_id ? 'border-red-500' : ''}>
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
                {errors.from_store_id && (
                  <p className="text-sm text-red-500 mt-1">{errors.from_store_id}</p>
                )}
              </div>
              <div>
                <Label htmlFor="to_store_id">To Store</Label>
                <Select
                  value={formData.to_store_id.toString()}
                  onValueChange={(value) => setFormData({ ...formData, to_store_id: parseInt(value) })}
                >
                  <SelectTrigger className={errors.to_store_id ? 'border-red-500' : ''}>
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
                {errors.to_store_id && (
                  <p className="text-sm text-red-500 mt-1">{errors.to_store_id}</p>
                )}
              </div>
              <div>
                <Label htmlFor="ref_no">Reference Number</Label>
                <Input
                  id="ref_no"
                  value={formData.ref_no}
                  onChange={(e) => setFormData({ ...formData, ref_no: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="order_no">Order Number</Label>
                <Input
                  id="order_no"
                  value={formData.order_no}
                  onChange={(e) => setFormData({ ...formData, order_no: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Detail Table */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <Label>Transfer Details</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddDetail}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
              {errors.details && (
                <p className="text-sm text-red-500 mb-2">{errors.details}</p>
              )}
              {details.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border border-dashed rounded-md">
                  No items added. Click "Add Item" to add transfer details.
                </div>
              ) : (
                <div className="space-y-3">
                  {details.map((detail, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-start p-3 border rounded-md">
                      <div className="col-span-4">
                        <Label className="text-xs text-gray-500">Item</Label>
                        <Select
                          value={detail.item_id.toString()}
                          onValueChange={(value) => handleDetailChange(index, 'item_id', parseInt(value))}
                        >
                          <SelectTrigger>
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
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-gray-500">Item Code</Label>
                        <Input
                          value={detail.item_code}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-gray-500">Item Name</Label>
                        <Input
                          value={detail.item_name}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-gray-500">Quantity</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={detail.qty || ''}
                          onChange={(e) => handleDetailChange(index, 'qty', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      <div className="col-span-1">
                        <Label className="text-xs text-gray-500">Ref</Label>
                        <Input
                          value={detail.ref || ''}
                          onChange={(e) => handleDetailChange(index, 'ref', e.target.value || null)}
                          placeholder="Optional"
                        />
                      </div>
                      <div className="col-span-1 flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDetail(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingTransferNote ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transfer Note Details - {viewingTransferNote?.v_no}</DialogTitle>
            <DialogDescription>
              View complete transfer note information
            </DialogDescription>
          </DialogHeader>

          {viewingTransferNote && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">Voucher Number</Label>
                  <p className="font-medium">{viewingTransferNote.v_no}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Date</Label>
                  <p className="font-medium">{formatDate(viewingTransferNote.date)}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">From Store</Label>
                  <p className="font-medium">{getStoreName(viewingTransferNote.from_store_id)}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">To Store</Label>
                  <p className="font-medium">{getStoreName(viewingTransferNote.to_store_id)}</p>
                </div>
                {viewingTransferNote.ref_no && (
                  <div>
                    <Label className="text-sm text-gray-500">Reference Number</Label>
                    <p className="font-medium">{viewingTransferNote.ref_no}</p>
                  </div>
                )}
                {viewingTransferNote.order_no && (
                  <div>
                    <Label className="text-sm text-gray-500">Order Number</Label>
                    <p className="font-medium">{viewingTransferNote.order_no}</p>
                  </div>
                )}
              </div>

              {viewingTransferNote.details && viewingTransferNote.details.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Transfer Details</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingTransferNote.details.map((detail) => (
                        <TableRow key={detail.id}>
                          <TableCell className="font-medium">{detail.item_code}</TableCell>
                          <TableCell>{detail.item_name}</TableCell>
                          <TableCell className="text-right">{detail.qty}</TableCell>
                          <TableCell>{detail.ref || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsViewDialogOpen(false)
              if (viewingTransferNote) handleOpenDialog(viewingTransferNote)
            }}>
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transfer Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete transfer note {transferNoteToDelete?.v_no}? This action cannot be undone and will also delete all related stock movements.
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
