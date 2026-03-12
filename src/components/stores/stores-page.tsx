'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/lib/api-client'
import { formatDate, cn } from '@/lib/utils'
import { Store } from '@/types'
import { Search, Plus, Edit, Trash2, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

export function StoresPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({ store_name: '' })
  const [errors, setErrors] = useState<{ store_name?: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [stores, setStores] = useState<Store[]>([])
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null)

  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)

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
    return stores.filter(
      (store) =>
        store.store_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.store_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [stores, searchTerm])

  const handleAddNew = () => {
    setSelectedStore(null)
    setIsAddingNew(true)
    setFormData({ store_name: '' })
    setErrors({})
    setIsFormDialogOpen(true)
  }

  const handleEditStore = (store: Store) => {
    setSelectedStore(store)
    setIsAddingNew(false)
    setFormData({ store_name: store.store_name })
    setErrors({})
    setIsFormDialogOpen(true)
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
      setIsSaving(true)
      if (isAddingNew) {
        const response = await apiClient.createStore(formData)
        if (response.success) {
          toast({ title: 'Success', description: 'Store created successfully' })
          fetchStores()
          setIsAddingNew(false)
          setFormData({ store_name: '' })
          setIsFormDialogOpen(false)
        }
      } else if (selectedStore) {
        const response = await apiClient.updateStore(selectedStore.id, formData)
        if (response.success) {
          toast({ title: 'Success', description: 'Store updated successfully' })
          fetchStores()
          setSelectedStore({ ...selectedStore, store_name: formData.store_name })
          setIsFormDialogOpen(false)
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save store',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
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
        if (selectedStore?.id === storeToDelete.id) {
          setSelectedStore(null)
          setIsEditingInPanel(false)
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete store',
        variant: 'destructive',
      })
    }
  }

  if (isLoading && filteredStores.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-gray-500" />
          <span className="text-gray-500 dark:text-gray-400">Loading stores...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative -mx-6 px-6" style={{ height: 'calc(100vh - 7rem)' }}>
      <div className="flex h-full w-full min-w-[600px]">
        {/* Stores list */}
        <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-800 h-full">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stores</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage store profiles</p>
              </div>
              <Button onClick={handleAddNew} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search stores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            {filteredStores.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No stores found</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Get started by adding your first store
                </p>
                <Button onClick={handleAddNew} className="mt-4" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Store
                </Button>
              </div>
            ) : (
              <div className="p-2">
                {filteredStores.map((store) => (
                  <div
                    key={store.id}
                    className={cn(
                      'p-3 rounded-lg transition-all mb-2 border',
                      selectedStore?.id === store.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-sm'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">{store.store_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{store.store_code}</div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditStore(store)}
                          className="h-6 w-6 p-0"
                          title="Edit"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setStoreToDelete(store)
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
      </div>

      <Dialog
        open={isFormDialogOpen}
        onOpenChange={(open) => {
          if (!open && isSaving) return
          setIsFormDialogOpen(open)
          if (!open) {
            setIsAddingNew(false)
            setSelectedStore(null)
            setFormData({ store_name: '' })
            setErrors({})
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAddingNew ? 'Add New Store' : 'Edit Store'}</DialogTitle>
            <DialogDescription>
              {isAddingNew ? 'Create a new store profile' : 'Update store information'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="store_name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Store Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="store_name"
                value={formData.store_name}
                onChange={(e) => {
                  setFormData({ ...formData, store_name: e.target.value })
                  if (errors.store_name) {
                    setErrors({ ...errors, store_name: undefined })
                  }
                }}
                className={errors.store_name ? 'border-red-500' : ''}
              />
              {errors.store_name && <p className="text-sm text-red-500 mt-1">{errors.store_name}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (isSaving) return
                setIsFormDialogOpen(false)
                setIsAddingNew(false)
                setSelectedStore(null)
                setFormData({ store_name: '' })
                setErrors({})
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isAddingNew ? 'Creating...' : 'Saving...'}
                </>
              ) : (
                isAddingNew ? 'Create' : 'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
