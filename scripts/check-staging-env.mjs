#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
// Validates Netlify staging settings without printing credentials.
// Usage: node scripts/check-staging-env.mjs
const STAGING_ORIGIN = "https://xofndnlyqueyuqyweqyi.supabase.co";

export function checkStagingEnvironment(env) {
  const errors = [];
  const required = ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  if (env.WOFFU_DEPLOYMENT_MODE !== "staging") errors.push("WOFFU_DEPLOYMENT_MODE must be staging");
  if (env.NEXT_PUBLIC_SUPABASE_URL !== STAGING_ORIGIN) errors.push("Supabase URL must be the isolated staging project");
  for (const name of required) {
    if (typeof env[name] !== "string" || env[name].trim().length === 0) {
      errors.push(name + " must be set in hosting environment settings");
    }
  }
  const rawSite = env.NEXT_PUBLIC_SITE_URL;
  try {
    const site = new URL(rawSite || "");
    if (site.protocol !== "https:" || !site.hostname.endsWith(".netlify.app") ||
        site.hostname === "netlify.app" || site.port || site.username ||
        site.password || !["", "/"].includes(site.pathname) ||
        site.search || site.hash) throw new Error("not a clean HTTPS Netlify origin");
  } catch {
    errors.push("NEXT_PUBLIC_SITE_URL must be a clean HTTPS *.netlify.app origin");
  }
  if (env.WOFFU_ENABLE_PREVIEW_MUTATIONS !== "true" &&
      env.WOFFU_ENABLE_PREVIEW_MUTATIONS !== "false") {
    errors.push("WOFFU_ENABLE_PREVIEW_MUTATIONS must explicitly be true or false");
  }
  return { ok: errors.length === 0, errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = checkStagingEnvironment(process.env);
  if (result.ok) {
    console.log("PASS: staging environment settings are present and isolated (credentials not displayed)");
  } else {
    for (const error of result.errors) console.error("ERROR:", error);
    process.exitCode = 1;
  }
}
