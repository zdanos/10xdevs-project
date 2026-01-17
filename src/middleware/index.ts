import { defineMiddleware } from "astro:middleware";

import { supabaseClient } from "../db/supabase.client.ts";

export const onRequest = defineMiddleware((context, next) => {
  context.locals.supabase = supabaseClient;

  // Extract locale from Accept-Language header for consistent server/client rendering
  const acceptLanguage = context.request.headers.get("accept-language");
  const locale = acceptLanguage?.split(",")[0]?.split("-")[0] || "en";
  context.locals.locale = locale;

  return next();
});
