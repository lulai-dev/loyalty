// Subdominios wildcard: cafe-irving.tudominio.com → /r/cafe-irving
// Requiere ROOT_DOMAIN y el dominio *.tudominio.com agregado en Vercel.
import { NextResponse } from "next/server";

const ROOT = (process.env.ROOT_DOMAIN || "").toLowerCase();

export function middleware(req) {
  if (!ROOT) return NextResponse.next();
  const host = (req.headers.get("host") || "").toLowerCase().split(":")[0];
  const { pathname } = req.nextUrl;

  // Rutas internas y de sistema: no tocar.
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/panel") ||
    pathname.startsWith("/r/")
  ) {
    return NextResponse.next();
  }

  if (host !== ROOT && host.endsWith("." + ROOT)) {
    const sub = host.slice(0, -(ROOT.length + 1));
    if (sub && !["www", "panel", "app"].includes(sub)) {
      const url = req.nextUrl.clone();
      url.pathname = `/r/${sub}${pathname === "/" ? "" : pathname}`;
      return NextResponse.rewrite(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
