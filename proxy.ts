import { NextResponse, type NextRequest } from "next/server";

/**
 * proxy.ts — No-op (uso personal sin auth).
 */
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
