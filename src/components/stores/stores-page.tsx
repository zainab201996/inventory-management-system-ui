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
  const [stores, setStores] = useState<Store[]>([])
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null)

  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [isEditingInPanel, setIsEditingInPanel] = useState(false)

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

  const handleSelectStore = useCallback((store: Store) => {
    setSelectedStore(store)
    setIsAddingNew(false)
    setIsEditingInPanel(false)
    setFormData({ store_name: store.store_name })
  }, [])

  const handleAddNew = () => {
    setSelectedStore(null)
    setIsAddingNew(true)
    setIsEditingInPanel(false)
    setFormData({ store_name: '' })
    setErrors({})
  }

  const handleCancelAddOrEdit = () => {
    setIsAddingNew(false)
    if (selectedStore) {
      setIsEditingInPanel(false)
      setFormData({ store_name: selectedStore.store_name })
    } else {
      setFormData({ store_name: '' })
    }
    setErrors({})
  }

  const handleStartEdit = () => {
    if (!selectedStore) return
    setIsEditingInPanel(true)
    setFormData({ store_name: selectedStore.store_name })
    setErrors({})
  }

  const handleEditStore = (store: Store) => {
    setSelectedStore(store)
    setIsAddingNew(false)
    setIsEditingInPanel(true)
    setFormData({ store_name: store.store_name })
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
      if (isAddingNew) {
        const response = await apiClient.createStore(formData)
        if (response.success) {
          toast({ title: 'Success', description: 'Store created successfully' })
          fetchStores()
          setIsAddingNew(false)
          setFormData({ store_name: '' })
        }
      } else if (selectedStore) {
        const response = await apiClient.updateStore(selectedStore.id, formData)
        if (response.success) {
          toast({ title: 'Success', description: 'Store updated successfully' })
          fetchStores()
          setSelectedStore({ ...selectedStore, store_name: formData.store_name })
          setIsEditingInPanel(false)
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

  const showDetailPanel = selectedStore || isAddingNew
  const showFormInPanel = isAddingNew || isEditingInPanel

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
      <div className="flex h-full gap-6 w-full min-w-[1000px]">
        {/* Left: Stores list */}
        <div className="w-70 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-800 h-full">
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
                    onClick={() => handleSelectStore(store)}
                    className={cn(
                      'p-3 rounded-lg cursor-pointer transition-all mb-2 border',
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
                      <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (selectedStore?.id === store.id) handleStartEdit()
                            else handleEditStore(store)
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

        {/* Right: Detail / Form */}
        <div className="flex-1 min-w-0 overflow-y-auto w-full custom-scrollbar">
          {!showDetailPanel ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <p className="text-gray-500 dark:text-gray-400">Select a store or add a new one</p>
              <Button onClick={handleAddNew} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Store
              </Button>
            </div>
          ) : (
            <div className="space-y-6 w-full p-6">
              <div className="rounded-md border border-gray-200 dark:border-gray-800 bg-transparent shadow-none p-4 w-full">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Store</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {isAddingNew ? 'New Store' : selectedStore?.store_name}
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
                    ) : selectedStore ? (
                      <>
                        <Button size="sm" variant="outline" onClick={handleStartEdit}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setStoreToDelete(selectedStore)
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
                    <div>
                      <Label htmlFor="store_name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Store Name
                      </Label>
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
                  ) : selectedStore ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Store Code</Label>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                          {selectedStore.store_code}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Store Name</Label>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                          {selectedStore.store_name}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Created At</Label>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                          {formatDate(selectedStore.created_at)}
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
