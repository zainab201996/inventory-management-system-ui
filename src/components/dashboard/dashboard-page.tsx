'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, AlertTriangle } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { Item, OpeningStock } from '@/types'

interface LowStockRow {
  item_id: number
  item_code: string
  item_name: string
  store_id: number
  store_code: string
  store_name: string
  qty: number
}

export function DashboardPage() {
  const [threshold, setThreshold] = useState<string>('10')
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchItemsWithStocks = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await apiClient.getItems({ all: true })
        if (response.success && response.data) {
          const baseItems = Array.isArray(response.data)
            ? response.data
            : response.data.items || []

          // Ensure opening_stocks are loaded for each item
          const detailedItems: Item[] = await Promise.all(
            baseItems.map(async (item: Item) => {
              // If opening_stocks already present, use as is
              if ((item as any).opening_stocks && (item as any).opening_stocks.length > 0) {
                return item
              }
              try {
                const itemResp = await apiClient.getItem(item.id, true)
                if (itemResp.success && itemResp.data) {
                  return itemResp.data
                }
              } catch {
                // Ignore and fall back to base item
              }
              return item
            })
          )

          setItems(detailedItems)
        } else {
          setError(response.message || 'Failed to load items')
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load items')
      } finally {
        setLoading(false)
      }
    }

    fetchItemsWithStocks()
  }, [])

  const numericThreshold = useMemo(() => {
    const n = parseFloat(threshold)
    return isNaN(n) || n < 0 ? 0 : n
  }, [threshold])

  const lowStockRows: LowStockRow[] = useMemo(() => {
    if (!items.length) return []

    const rows: LowStockRow[] = []

    items.forEach((item) => {
      const stocks = (item as any).opening_stocks as OpeningStock[] | undefined
      if (!stocks || !stocks.length) return

      stocks.forEach((stock) => {
        const qty = Number(stock.opening_qty ?? 0)
        if (qty < numericThreshold) {
          rows.push({
            item_id: item.id,
            item_code: item.item_code,
            item_name: item.item_name,
            store_id: stock.store_id,
            store_code: (stock as any).store_code || (stock as any).store?.store_code || 'N/A',
            store_name: (stock as any).store_name || (stock as any).store?.store_name || 'N/A',
            qty,
          })
        }
      })
    })

    // Sort by store then item
    return rows.sort((a, b) => {
      if (a.store_code === b.store_code) {
        return a.item_code.localeCompare(b.item_code)
      }
      return a.store_code.localeCompare(b.store_code)
    })
  }, [items, numericThreshold])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Low Stock Report — view items below the selected stock level.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Low Stock Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-full sm:w-40">
              <label
                htmlFor="threshold"
                className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5"
              >
                Low stock threshold (quantity)
              </label>
              <Input
                id="threshold"
                type="number"
                min="0"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="h-9"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              All item-store combinations where available quantity is below this number will appear in the table.
              For now, this uses opening stock as the available quantity.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-gray-500" />
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                Loading items and opening stock...
              </span>
            </div>
          ) : error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store Code</TableHead>
                    <TableHead>Store Name</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        No items found below the low stock threshold of {numericThreshold}.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lowStockRows.map((row, idx) => (
                      <TableRow key={`${row.item_id}-${row.store_id}-${idx}`}>
                        <TableCell className="font-medium">{row.store_code}</TableCell>
                        <TableCell>{row.store_name}</TableCell>
                        <TableCell>{row.item_code}</TableCell>
                        <TableCell>{row.item_name}</TableCell>
                        <TableCell className="text-right">{row.qty}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
