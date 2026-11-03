/**
 * WOFFU OS V2 deploy safety.
 *
 * Preview/staging must NEVER use the production Supabase project, even if
 * someone accidentally enables write operations in the hosting dashboard.
 * Project refs are PUBLIC identifiers; no credentials belong in this file.
 */
export const WOFFU_STAGING_PROJECT_REF = "xofndnlyqueyuqyweqyi";

export type DeploymentEnvironment = {
  VERCEL_ENV?: string;
  WOFFU_DEPLOYMENT_MODE?: string;
  WOFFU_ENABLE_PREVIEW_MUTATIONS?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
};

export type DeploymentSafetyState = {
  preview: boolean;
  stagingConnected: boolean;
  readOnly: boolean;
  blockedDatabase: boolean;
  reason: "production" | "staging-required" | "read-only" | "staging-ready";
};

/** Exact host match: lookalikes or custom domains do NOT satisfy isolation. */
export function isVerifiedStagingUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === `${WOFFU_STAGING_PROJECT_REF}.supabase.co` &&
      url.port === "" &&
      url.username === "" &&
      url.password === "" &&
      (url.pathname === "/" || url.pathname === "") &&
      url.search === "" && url.hash === "";
  } catch {
    return false;
  }
}

export function getDeploymentSafety(env: DeploymentEnvironment): DeploymentSafetyState {
  const preview = env.VERCEL_ENV === "preview" || env.WOFFU_DEPLOYMENT_MODE === "staging";
  if (!preview) {
    return {
      preview: false, stagingConnected: false, readOnly: false,
      blockedDatabase: false, reason: "production",
    };
  }

  const stagingConnected = isVerifiedStagingUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const enabled = env.WOFFU_ENABLE_PREVIEW_MUTATIONS === "true";
  return {
    preview: true,
    stagingConnected,
    readOnly: !stagingConnected || !enabled,
    blockedDatabase: !stagingConnected,
    reason: !stagingConnected ? "staging-required" : enabled ? "staging-ready" : "read-only",
  };
}

export function isUnsafeMethod(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}
