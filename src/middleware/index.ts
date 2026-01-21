import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.client.ts";

// Auth paths that should redirect if user is already authenticated
const AUTH_PATHS = ["/login", "/register"];

export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  // Extract locale from Accept-Language header for consistent server/client rendering
  const acceptLanguage = request.headers.get("accept-language");
  const locale = acceptLanguage?.split(",")[0]?.split("-")[0] || "en";
  locals.locale = locale;

  // Create Supabase client for this request
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Store supabase client in locals for use in pages and actions
  locals.supabase = supabase;

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Store user in locals
  if (user) {
    locals.user = {
      id: user.id,
      email: user.email,
    };
  } else {
    locals.user = null;
  }

  // Handle route protection
  const pathname = url.pathname;

  // If user is authenticated and trying to access auth pages, redirect to app
  if (user && AUTH_PATHS.includes(pathname)) {
    return redirect("/app/decks");
  }

  // If user is not authenticated and trying to access protected routes, redirect to login
  if (!user && pathname.startsWith("/app")) {
    return redirect("/login");
  }

  // Temporary: Redirect root to login (will be landing page later)
  if (pathname === "/" && !user) {
    return redirect("/login");
  }

  // If authenticated user visits root, redirect to app
  if (pathname === "/" && user) {
    return redirect("/app/decks");
  }

  return next();
});
