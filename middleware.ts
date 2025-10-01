import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request: req,
  });

  const supabase = createServerClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // 重要：刷新会话（如果过期则自动刷新）
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 需要认证的路由
  const protectedPaths = ["/dashboard"];
  const isProtectedPath = protectedPaths.some((path) =>
    req.nextUrl.pathname.startsWith(path)
  );

  // 认证相关路由
  const authPaths = ["/login", "/signup"];
  const isAuthPath = authPaths.some((path) =>
    req.nextUrl.pathname.startsWith(path)
  );

  // 未登录访问受保护路由，重定向到登录页
  if (isProtectedPath && !session) {
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 已登录访问认证页面，重定向到 dashboard
  if (isAuthPath && session) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
