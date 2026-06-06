import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  // Check for session cookies directly to avoid Edge runtime secure prefix mismatches
  const hasSessionCookie = 
    req.cookies.has("authjs.session-token") || 
    req.cookies.has("__Secure-authjs.session-token") ||
    req.cookies.has("next-auth.session-token") ||
    req.cookies.has("__Secure-next-auth.session-token");

  const isLoggedIn = hasSessionCookie;
  const { nextUrl } = req;

  if (nextUrl.pathname === "/" || nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  if (nextUrl.pathname.startsWith("/join")) {
    return NextResponse.next()
  }

  const redirectToLogin = () => NextResponse.redirect(new URL("/", req.url))

  if (nextUrl.pathname.startsWith("/dashboard")) {
    return isLoggedIn ? NextResponse.next() : redirectToLogin()
  }

  if (nextUrl.pathname.startsWith("/links")) {
    return isLoggedIn ? NextResponse.next() : redirectToLogin()
  }

  if (!isLoggedIn) {
    return redirectToLogin()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.svg (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.svg).*)',
  ],
}
