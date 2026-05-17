import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const publicRoutes = [
  "/",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/verify-code",
];

const publicApiRoutes = [
  "/api/users/sign-up",
  "/api/users/sign-in",
  "/api/users/verify-code",
  "/api/users/forgot-password",
  "/api/users/reset-password",
];

const openRoutes = ["/chat"];

export default async function proxy(request: NextRequest) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is missing");

  const encodedSecret = new TextEncoder().encode(secret);
  const path = request.nextUrl.pathname;
  const token = request.cookies.get("token")?.value;

  const nextPath = `${path}${request.nextUrl.search}`;
  const signInUrl = new URL("/sign-in", request.nextUrl);
  signInUrl.searchParams.set("next", nextPath);

  const isPublicPage = publicRoutes.some(
    (route) =>
      path === route || (route !== "/" && path.startsWith(route + "/")),
  );
  const isPublicApi = publicApiRoutes.includes(path);
  const isPublic = isPublicPage || isPublicApi;

  const isOpen = openRoutes.includes(path);

  const isApiRoute = path.startsWith("/api");

  try {
    if (isOpen) {
      if (token) {
        await jwtVerify(token, encodedSecret);
      }
      return NextResponse.next();
    }

    // Public API routes should never be blocked, even with a bad cookie
    if (isPublicApi) {
      return NextResponse.next();
    }

    if (!isPublic && !token) {
      if (isApiRoute) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(signInUrl);
    }

    if (token) {
      await jwtVerify(token, encodedSecret);

      if (isPublicPage) {
        return NextResponse.redirect(new URL("/chat", request.nextUrl));
      }
    }

    return NextResponse.next();
  } catch {
    const response = isApiRoute
      ? NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 401 },
        )
      : isOpen
        ? NextResponse.next()
        : NextResponse.redirect(signInUrl);

    response.cookies.set("token", "", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });

    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
