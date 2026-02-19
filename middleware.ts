import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const { nextUrl } = req
  const isLoggedIn = !!token

  if (nextUrl.pathname === "/" || nextUrl.pathname.startsWith("/api/auth")) {
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


