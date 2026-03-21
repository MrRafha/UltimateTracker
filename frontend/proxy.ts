import { NextResponse, type NextRequest } from "next/server";

const FRONTEND_PAUSED = process.env.NEXT_PUBLIC_FRONTEND_PAUSED !== "false";

export function proxy(request: NextRequest) {
  if (FRONTEND_PAUSED && request.nextUrl.pathname !== "/") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
