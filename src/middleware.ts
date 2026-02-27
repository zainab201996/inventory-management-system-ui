import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Allow access to login page and public assets
  if (request.nextUrl.pathname === '/login' || 
      request.nextUrl.pathname.startsWith('/_next') ||
      request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // For protected routes, we'll let the client-side handle authentication
  // The middleware just allows the request through
  // Client-side components will check for token and redirect if needed
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - images (static images from public folder)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|images|favicon.ico).*)',
  ],
}

