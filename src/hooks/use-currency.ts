import { useSettings } from '@/hooks/use-settings'
import { CURRENCY_SYMBOL as DEFAULT_CURRENCY_SYMBOL } from '@/lib/utils'

export function useCurrency() {
  const { settings } = useSettings()

  const symbol = settings?.currency_symbol ?? DEFAULT_CURRENCY_SYMBOL
  const code = settings?.currency_code ?? null

  return {
    currencySymbol: symbol,
    currencyCode: code,
  }
}

