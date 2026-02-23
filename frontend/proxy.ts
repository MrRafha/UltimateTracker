import { NextResponse, type NextRequest } from "next/server";

// NOTE: Session cookie is set by the backend (different domain in production).
// The Next.js middleware cannot read cross-domain cookies, so route protection
// is handled entirely client-side via the useMe / useMyGuilds hooks.
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/map/:path*", "/dashboard/:path*", "/admin/:path*"],
};
