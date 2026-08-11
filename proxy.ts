import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = new Set(["/", "/login", "/forgot-password", "/reset-password", "/activate", "/terms", "/privacy"])

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  if (pathname === "/" && searchParams.toString()) {
    const cleanUrl = new URL(request.url)
    cleanUrl.search = ""
    return NextResponse.redirect(cleanUrl, 302)
  }

  if (pathname === "/activate" && !request.nextUrl.searchParams.has("token")) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|api/).*)"],
}
