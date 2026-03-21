import { NextResponse, type NextRequest } from "next/server";

// Legacy file kept for compatibility. Route redirection now lives in middleware.ts.

export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
