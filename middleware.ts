import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = new Set(["/", "/login", "/forgot-password", "/reset-password", "/activate", "/terms", "/privacy"])

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  if (pathname === "/" && searchParams.toString()) {
    const cleanUrl = new URL(request.url)
    cleanUrl.search = ""
    return NextResponse.redirect(cleanUrl, 302)
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|api/).*)"],
}
