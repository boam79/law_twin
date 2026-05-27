import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "./lib/rateLimit.js";

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-site",
};

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

function applySecurityHeaders(response) {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname === "/api/analyze" && request.method === "POST") {
    const ip = getClientIp(request);
    const configuredLimit = Number.parseInt(process.env.ANALYZE_RATE_LIMIT || "24", 10);
    const limit =
      Number.isFinite(configuredLimit) && configuredLimit > 0 ? Math.min(configuredLimit, 500) : 24;
    const rate = checkRateLimit(`analyze:${ip}`, { limit, windowMs: 60_000 });
    if (!rate.allowed) {
      const blocked = NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
      blocked.headers.set("Retry-After", String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))));
      return applySecurityHeaders(blocked);
    }
  }

  if (pathname === "/api/analyze" && !["GET", "POST"].includes(request.method)) {
    const methodNotAllowed = NextResponse.json({ error: "허용되지 않은 메서드입니다." }, { status: 405 });
    return applySecurityHeaders(methodNotAllowed);
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
