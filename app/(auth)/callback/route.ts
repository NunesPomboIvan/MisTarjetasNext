import { NextResponse, type NextRequest } from "next/server";

export function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/`);
}
