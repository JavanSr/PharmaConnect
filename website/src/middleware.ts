import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hasAccess =
    request.cookies.get("pharmaconnect_investor_access")?.value === "granted";
  const response = NextResponse.next();
  response.headers.set("x-pharmaconnect-investor-access", hasAccess ? "granted" : "gate");

  if (!hasAccess && request.nextUrl.pathname.startsWith("/investors/brief")) {
    const url = request.nextUrl.clone();
    url.pathname = "/investors";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/investors/:path*"],
};
