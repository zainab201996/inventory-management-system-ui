import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/context/ThemeContext'
import { Toaster } from '@/components/ui/toaster'

const outfit = Outfit({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Inventory Management System',
  description: 'Admin panel for Inventory Management System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${outfit.className} bg-gray-50 dark:bg-gray-900`}>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}

