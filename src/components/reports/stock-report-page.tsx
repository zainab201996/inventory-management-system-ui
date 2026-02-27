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
import { CURRENCY_SYMBOL, formatDate } from '@/lib/utils'
import { Item, Rate, StockReport, StockReportFilters, Store } from '@/types'
import { Loader2, Search, X } from 'lucide-react'

export function StockReportPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [rates, setRates] = useState<Rate[]>([])
  const [report, setReport] = useState<StockReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [storeFilter, setStoreFilter] = useState<string>('all')
  const [fromDate, setFromDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [toDate, setToDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [productSearch, setProductSearch] = useState('')

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [storesRes, itemsRes, ratesRes] = await Promise.all([
          apiClient.getStores({ all: true }),
          apiClient.getItems({ all: true }),
          apiClient.getRates({ all: true, sort_by: 'effective_date', sort_order: 'desc' }),
        ])

        if (storesRes.success && storesRes.data) {
          const storesData = Array.isArray(storesRes.data) ? storesRes.data : storesRes.data.stores || []
          setStores(storesData)
        }

        if (itemsRes.success && itemsRes.data) {
          const itemsData = Array.isArray(itemsRes.data) ? itemsRes.data : itemsRes.data.items || []
          setItems(itemsData)
        }

        if (ratesRes.success && ratesRes.data) {
          const ratesData = Array.isArray(ratesRes.data) ? ratesRes.data : ratesRes.data.rates || []
          setRates(ratesData)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load lookup data')
      }
    }

    fetchLookups()
  }, [])

  const ratesByItemId = useMemo(() => {
    const map = new Map<number, number>()
    for (const rate of rates) {
      if (!map.has(rate.item_id)) {
        map.set(rate.item_id, rate.rate)
      }
    }
    return map
  }, [rates])

  // Auto-load initial report when page opens
  useEffect(() => {
    handleLoadReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLoadReport = async () => {
    setLoading(true)
    setError(null)

    try {
      const filters: StockReportFilters = {
        fromDate,
        toDate,
      }

      if (storeFilter !== 'all') {
        filters.store_id = parseInt(storeFilter, 10)
      }

      const response = await apiClient.getStockReport(filters)
      if (response.success && response.data) {
        setReport(response.data)
      } else {
        setReport([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stock report')
      setReport([])
    } finally {
      setLoading(false)
    }
  }

  const handleClearFilters = () => {
    setStoreFilter('all')
    setFromDate('')
    setToDate('')
    setProductSearch('')
    setReport(null)
    setError(null)
  }

  const filteredItems = useMemo(() => {
    if (!report) return []

    return report.filter((row) => {
      if (productSearch) {
        const search = productSearch.toLowerCase()
        const matchesProduct =
          row.item_code.toLowerCase().includes(search) ||
          row.item_name.toLowerCase().includes(search) ||
          row.item_category.toLowerCase().includes(search)
        if (!matchesProduct) return false
      }

      if (storeFilter !== 'all' && row.store_id !== parseInt(storeFilter, 10)) {
        return false
      }

      return true
    })
  }, [report, productSearch, storeFilter])

  const summary = useMemo(() => {
    if (!filteredItems.length) {
      return {
        totalItems: 0,
        totalStores: 0,
        totalCurrentStock: 0,
        totalStockValue: 0,
      }
    }

    const uniqueItems = new Set<number>()
    const uniqueStores = new Set<number>()
    let totalCurrentStock = 0
    let totalStockValue = 0

    for (const row of filteredItems) {
      uniqueItems.add(row.item_id)
      uniqueStores.add(row.store_id)
      totalCurrentStock += row.closing_qty
      const rate = row.stock_rate ?? ratesByItemId.get(row.item_id) ?? 0
      totalStockValue += row.stock_value ?? row.closing_qty * rate
    }

    return {
      totalItems: uniqueItems.size,
      totalStores: uniqueStores.size,
      totalCurrentStock,
      totalStockValue,
    }
  }, [filteredItems, ratesByItemId])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Store Wise Stock Report</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          View opening, movements, and current stock value by product and store.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Store Wise Stock</CardTitle>
          <CardDescription>
            Parameters: From Date, To Date, Store
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="store">Store</Label>
                <Select value={storeFilter} onValueChange={setStoreFilter}>
                  <SelectTrigger id="store">
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-search">Search Product</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="product-search"
                    placeholder="Search by code, name, or category..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleLoadReport} disabled={loading}>
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

          {report && (
            <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/40">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Total Products
                </div>
                <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {summary.totalItems.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/40">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Total Stores
                </div>
                <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {summary.totalStores.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/40">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Total Current Stock
                </div>
                <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {summary.totalCurrentStock.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/40">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Stock Value
                </div>
                <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {CURRENCY_SYMBOL} {summary.totalStockValue.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">Product</TableHead>
                  <TableHead className="min-w-[140px]">Store</TableHead>
                  <TableHead className="text-right">Opening</TableHead>
                  <TableHead className="text-right">Purchase</TableHead>
                  <TableHead className="text-right">Transfer In</TableHead>
                  <TableHead className="text-right">Transfer Out</TableHead>
                  <TableHead className="text-right">Closing</TableHead>
                  <TableHead className="text-right">Stock Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!report || loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Loading stock report...</span>
                        </div>
                      ) : (
                        'Apply filters to view stock report'
                      )}
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                      No stock records found for the selected parameters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((row) => {
                    const rate = row.stock_rate ?? ratesByItemId.get(row.item_id) ?? 0
                    const stockValue = row.stock_value ?? row.closing_qty * rate

                    return (
                      <TableRow key={`${row.store_id}-${row.item_id}`}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {row.item_code} - {row.item_name}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {row.item_category}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {row.store_code}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {row.store_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {row.opening_qty.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.purchase_qty.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.transfer_in_qty.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.transfer_out_qty.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.closing_qty.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {rate > 0 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">
                              {CURRENCY_SYMBOL} {rate.toLocaleString()} / unit
                            </span>
                          )}
                          <div className="font-medium text-gray-900 dark:text-white">
                            {CURRENCY_SYMBOL} {stockValue.toLocaleString()}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {report && (toDate || fromDate) && (
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              As on date:{' '}
              {formatDate(toDate || fromDate)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default StockReportPage
