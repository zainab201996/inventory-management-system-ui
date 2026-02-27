'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { apiClient } from '@/lib/api-client'
import { formatDate } from '@/lib/utils'
import { Store } from '@/types'
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

export function StoresPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [formData, setFormData] = useState({ store_name: '' })
  const [errors, setErrors] = useState<{ store_name?: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [stores, setStores] = useState<Store[]>([])
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null)
  const { toast } = useToast()

  const fetchStores = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.getStores({ all: true })
      if (response.success && response.data) {
        const storesData = Array.isArray(response.data) ? response.data : response.data.stores || []
        setStores(storesData)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch stores',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchStores()
  }, [fetchStores])

  const filteredStores = useMemo(() => {
    if (!searchTerm) return stores
    return stores.filter(store =>
      store.store_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.store_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [stores, searchTerm])

  const handleOpenDialog = (store?: Store) => {
    if (store) {
      setEditingStore(store)
      setFormData({ store_name: store.store_name })
    } else {
      setEditingStore(null)
      setFormData({ store_name: '' })
    }
    setErrors({})
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingStore(null)
    setFormData({ store_name: '' })
    setErrors({})
  }

  const validateForm = () => {
    const newErrors: { store_name?: string } = {}
    if (!formData.store_name.trim()) {
      newErrors.store_name = 'Store name is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      if (editingStore) {
        const response = await apiClient.updateStore(editingStore.id, formData)
        if (response.success) {
          toast({ title: 'Success', description: 'Store updated successfully' })
          fetchStores()
          handleCloseDialog()
        }
      } else {
        const response = await apiClient.createStore(formData)
        if (response.success) {
          toast({ title: 'Success', description: 'Store created successfully' })
          fetchStores()
          handleCloseDialog()
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save store',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!storeToDelete) return
    try {
      const response = await apiClient.deleteStore(storeToDelete.id)
      if (response.success) {
        toast({ title: 'Success', description: 'Store deleted successfully' })
        fetchStores()
        setIsDeleteConfirmOpen(false)
        setStoreToDelete(null)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete store',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Stores</CardTitle>
          <CardDescription>Manage store profiles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search stores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Store
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
                  <TableHead>Store Code</TableHead>
                  <TableHead>Store Name</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      No stores found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStores.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell className="font-medium">{store.store_code}</TableCell>
                      <TableCell>{store.store_name}</TableCell>
                      <TableCell>{formatDate(store.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(store)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setStoreToDelete(store)
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
            <DialogTitle>{editingStore ? 'Edit Store' : 'Create Store'}</DialogTitle>
            <DialogDescription>
              {editingStore ? 'Update store information' : 'Add a new store to the system'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="store_name">Store Name</Label>
              <Input
                id="store_name"
                value={formData.store_name}
                onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                className={errors.store_name ? 'border-red-500' : ''}
              />
              {errors.store_name && (
                <p className="text-sm text-red-500 mt-1">{errors.store_name}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingStore ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Store</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {storeToDelete?.store_name}? This action cannot be undone.
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
