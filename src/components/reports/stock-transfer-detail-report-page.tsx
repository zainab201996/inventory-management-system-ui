'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { apiClient } from '@/lib/api-client'
import { formatDate } from '@/lib/utils'
import { Item, StockTransferDetailReport, StockTransferDetailReportFilters, Store } from '@/types'
import { Loader2, Search, X } from 'lucide-react'

export function StockTransferDetailReportPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [report, setReport] = useState<StockTransferDetailReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fromStoreId, setFromStoreId] = useState<string>('all')
  const [toStoreId, setToStoreId] = useState<string>('all')
  const [fromDate, setFromDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [toDate, setToDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [storesRes, itemsRes] = await Promise.all([
          apiClient.getStores({ all: true }),
          apiClient.getItems({ all: true }),
        ])

        if (storesRes.success && storesRes.data) {
          const storesData = Array.isArray(storesRes.data) ? storesRes.data : storesRes.data.stores || []
          setStores(storesData)
        }

        if (itemsRes.success && itemsRes.data) {
          const itemsData = Array.isArray(itemsRes.data) ? itemsRes.data : itemsRes.data.items || []
          setItems(itemsData)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load lookup data')
      }
    }

    fetchLookups()
  }, [])

  // Auto-load initial report when page opens
  useEffect(() => {
    handleLoadReport(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLoadReport = async (page = 1) => {
    setLoading(true)
    setError(null)

    try {
      const filters: StockTransferDetailReportFilters = {
        fromDate,
        toDate,
      }

      if (fromStoreId !== 'all') {
        filters.from_store_id = parseInt(fromStoreId, 10)
      }
      if (toStoreId !== 'all') {
        filters.to_store_id = parseInt(toStoreId, 10)
      }

      const response = await apiClient.getStockTransferDetailReport(filters)
      if (response.success && response.data) {
        setReport(response.data)
        setCurrentPage(page)
      } else {
        setReport([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stock transfer detail report')
      setReport([])
    } finally {
      setLoading(false)
    }
  }

  const handleClearFilters = () => {
    setFromStoreId('all')
    setToStoreId('all')
    setFromDate('')
    setToDate('')
    setSearchTerm('')
    setReport(null)
    setError(null)
    setCurrentPage(1)
  }

  const filteredTransfers = useMemo(() => {
    if (!report) return []
    if (!searchTerm) return report

    const search = searchTerm.toLowerCase()
    return report.filter((t) => {
      return (
        t.v_no.toLowerCase().includes(search) ||
        (t.ref_no || '').toLowerCase().includes(search) ||
        (t.order_no || '').toLowerCase().includes(search) ||
        t.item_code.toLowerCase().includes(search) ||
        t.item_name.toLowerCase().includes(search) ||
        t.from_store_name.toLowerCase().includes(search) ||
        t.to_store_name.toLowerCase().includes(search)
      )
    })
  }, [report, searchTerm])

  const pagination = null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Store Transfer Detail</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          View detailed store-to-store stock transfer movements with filters.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Store Transfer Detail</CardTitle>
          <CardDescription>
            Parameters: From Store, To Store, From Date, To Date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from-store">From Store</Label>
                <Select value={fromStoreId} onValueChange={setFromStoreId}>
                  <SelectTrigger id="from-store">
                    <SelectValue placeholder="All stores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stores</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id.toString()}>
                        {store.store_code} - {store.store_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="to-store">To Store</Label>
                <Select value={toStoreId} onValueChange={setToStoreId}>
                  <SelectTrigger id="to-store">
                    <SelectValue placeholder="All stores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stores</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id.toString()}>
                        {store.store_code} - {store.store_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Product parameter is intentionally omitted from filters per API spec */}
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Search voucher, reference, product, or store..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from-date">From Date</Label>
                <Input
                  id="from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to-date">To Date</Label>
                <Input
                  id="to-date"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={() => handleLoadReport(1)} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Apply Filters
                </Button>
                <Button variant="outline" onClick={handleClearFilters} disabled={loading}>
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead colSpan={8} className="text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
                    General Meta Data
                  </TableHead>
                </TableRow>
                <TableRow>
                  <TableHead>Voucher No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>From Store</TableHead>
                  <TableHead>To Store</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Order No</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!report || loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-gray-500">
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Loading transfer details...</span>
                        </div>
                      ) : (
                        'Apply filters to view transfer details'
                      )}
                    </TableCell>
                  </TableRow>
                ) : filteredTransfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-gray-500">
                      No transfer records found for the selected parameters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransfers.map((t) => (
                    <TableRow key={t.transfer_note_id}>
                      <TableCell className="font-medium text-gray-900 dark:text-white">
                        {t.v_no}
                      </TableCell>
                      <TableCell>{formatDate(t.date)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {t.from_store_code}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {t.from_store_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {t.to_store_code}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {t.to_store_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {t.item_code}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {t.item_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {t.qty.toLocaleString()}
                      </TableCell>
                      <TableCell>{t.ref || '-'}</TableCell>
                      <TableCell>{t.order_no || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {pagination && pagination.total_pages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} transfers
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLoadReport(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  Previous
                </Button>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Page {currentPage} of {pagination.total_pages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLoadReport(Math.min(pagination.total_pages, currentPage + 1))}
                  disabled={currentPage === pagination.total_pages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
