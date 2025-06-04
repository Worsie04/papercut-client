import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public paths that don't require authentication
const publicPaths = [
  '/login',
  '/create-password',
  '/forgot-password',
  '/reset-password',
  '/register',
  '/privacy',
  '/terms',
];

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Check if the path is public
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path) || pathname === '/');

  // Check for authentication token (multiple sources)
  const hasAuthCookie = request.cookies.has('access_token_w');
  const authCookieValue = request.cookies.get('access_token_w')?.value;
  
  // Additional checks for production debugging
  const userAgent = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';
  
  // Check for special conditions like magic links
  const hasMagicToken = searchParams.has('token');
  const isCreatePasswordPage = pathname === '/create-password';

  console.log(`Middleware - Path: ${pathname}, Public: ${isPublicPath}, Auth Cookie: ${hasAuthCookie}, Cookie Value: ${authCookieValue ? 'exists' : 'missing'}, Token: ${hasMagicToken}, User-Agent: ${userAgent.slice(0, 50)}`);

  // Allow access to paths with magic tokens
  if (hasMagicToken || isCreatePasswordPage) {
    console.log('Allowing access due to magic token or create-password page');
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login if trying to access protected routes
  if (!hasAuthCookie && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname + request.nextUrl.search);
    console.log(`Redirecting unauthenticated user to: ${loginUrl}`);
    
    // Add headers to help with debugging
    const response = NextResponse.redirect(loginUrl);
    response.headers.set('X-Redirect-Reason', 'missing-auth-cookie');
    response.headers.set('X-Original-Path', pathname);
    return response;
  }

  // Redirect authenticated users away from login pages (unless using magic link)
  if (hasAuthCookie && pathname === '/login' && !hasMagicToken) {
    console.log('Redirecting authenticated user from login to dashboard');
    const dashboardUrl = new URL('/dashboard', request.url);
    const response = NextResponse.redirect(dashboardUrl);
    response.headers.set('X-Redirect-Reason', 'already-authenticated');
    return response;
  }

  // For API routes, add additional headers
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  }

  // Add debug headers for production troubleshooting
  const response = NextResponse.next();
  response.headers.set('X-Auth-Status', hasAuthCookie ? 'authenticated' : 'unauthenticated');
  response.headers.set('X-Path-Type', isPublicPath ? 'public' : 'protected');
  
  return response;
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)',
  ],
};