import { NextResponse, type NextRequest } from "next/server";

// Routes that require a Discord session
const PROTECTED = ["/map", "/dashboard"];
const ADMIN_PROTECTED = ["/admin"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = request.cookies.get("session");

  // Admin routes: redirect to login if no session (backend enforces admin table check)
  if (ADMIN_PROTECTED.some((p) => pathname.startsWith(p))) {
    if (!session?.value) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  if (!session?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/map/:path*", "/dashboard/:path*", "/admin/:path*"],
};
