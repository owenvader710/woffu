#!/usr/bin/env node
// Public, credential-free smoke test for a separately deployed WOFFU V2 staging site.
// Usage: node scripts/check-staging-site.mjs https://your-site.netlify.app
import assert from "node:assert/strict";

export function parseStagingOrigin(value) {
  if (typeof value !== "string" || !value) throw new Error("Staging URL is required");
  const url = new URL(value);
  if (url.protocol !== "https:" ||
      !url.hostname.endsWith(".netlify.app") ||
      url.hostname === ".netlify.app" ||
      url.port || url.username || url.password ||
      !["", "/"].includes(url.pathname) || url.search || url.hash) {
    throw new Error("Expected a clean HTTPS *.netlify.app origin");
  }
  return url.origin;
}

export async function inspectStagingSite(origin, fetcher = fetch) {
  const request = async (path) => {
    const response = await fetcher(new URL(path, origin), {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
      headers: { "Cache-Control": "no-cache" },
    });
    return response;
  };

  const runtime = await request("/api/runtime-mode");
  assert.equal(runtime.status, 200, "Runtime health endpoint must respond 200");
  const mode = await runtime.json();
  assert.equal(mode.preview, true, "Site must be in preview/staging mode");
  assert.equal(mode.stagingConnected, true, "Site must use the verified staging database");
  assert.equal(mode.blockedDatabase, false, "Staging database should be verified");
  assert.ok(
    (mode.readOnly === true && mode.reason === "read-only") ||
    (mode.readOnly === false && mode.reason === "staging-ready"),
    "Unexpected staging safety state"
  );

  const login = await request("/login");
  assert.equal(login.status, 200, "Login page must be reachable");
  const html = await login.text();
  assert.match(html, /WOFFU/i, "Login page must render WOFFU branding");
  // The public site must not expose an authenticated user without cookies.
  const identity = await request("/api/me");
  assert.equal(identity.status, 401, "Unauthenticated identity must return 401");
  const identityBody = await identity.json();
  assert.equal(identityBody.user, null, "Unauthenticated identity must not disclose user data");

  // The route must reject anonymous requests before even querying project rows.
  const projects = await request("/api/projects");
  assert.equal(projects.status, 401, "Unauthenticated project list must be rejected");
  const projectBody = await projects.json();
  assert.ok(!("data" in projectBody), "Public requests must not expose project records");

  for (const path of ["/api/members", "/api/dashboard", "/api/team-notices", "/api/profiles", "/api/profile"]) {
    const response = await request(path);
    assert.equal(response.status, 401, `${path} must reject anonymous visitors`);
    const body = await response.json();
    assert.ok(!("data" in body), `${path} must not expose team or dashboard data`);
  }

  return { origin, stagingConnected: true, readOnly: mode.readOnly, login: "ok", publicDataIsolation: "ok" };
}

if (process.argv[1] && import.meta.url === new URL("file://" + process.argv[1]).href) {
  try {
    const origin = parseStagingOrigin(process.argv[2] || process.env.STAGING_BASE_URL);
    const result = await inspectStagingSite(origin);
    console.log("PASS: public staging smoke test", JSON.stringify(result));
  } catch (error) {
    console.error("FAIL: staging not ready:", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
