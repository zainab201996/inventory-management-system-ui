'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldX, Home, ArrowLeft } from 'lucide-react'

export default function UnauthorizedPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <ShieldX className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
              401
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              Unauthorized Access
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-gray-600 dark:text-gray-400">
            <p className="mb-2">
              You don't have permission to access this page.
            </p>
            <p className="text-sm">
              Please contact your administrator if you believe this is an error.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => router.push('/')}
              className="w-full"
              size="lg"
            >
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
            {/* <Button
              onClick={() => router.back()}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button> */}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
