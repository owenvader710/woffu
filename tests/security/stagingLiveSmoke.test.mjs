import test from "node:test";
import assert from "node:assert/strict";
import { parseStagingOrigin, inspectStagingSite } from "../../scripts/check-staging-site.mjs";

test("only clean HTTPS Netlify origins are accepted", () => {
  assert.equal(parseStagingOrigin("https://woffu-v2.netlify.app/"), "https://woffu-v2.netlify.app");
  for (const candidate of [
    "http://woffu.netlify.app", "https://woffu.netlify.app.attacker.test",
    "https://woffu.netlify.app@attacker.test", "https://woffu.netlify.app/admin",
    "https://woffu.netlify.app?x=1", "https://woffu.netlify.app:8443",
    "https://netlify.app", "", "invalid",
  ]) assert.throws(() => parseStagingOrigin(candidate), candidate);
});

function mockFetch(mode, overrides = {}) {
  return async (url) => {
    const path = new URL(url).pathname;
    if (overrides[path]) return overrides[path];
    if (path === "/api/runtime-mode") return {
      status: 200,
      json: async () => mode,
    };
    if (path === "/login") return {
      status: 200,
      text: async () => "<title>WOFFU OS</title>",
    };
    if (path === "/api/me") return { status: 401, json: async () => ({ user: null }) };
    if (path === "/api/projects") return { status: 401, json: async () => ({ error: "Unauthorized" }) };
    if (path === "/api/members" || path === "/api/dashboard") return { status: 401, json: async () => ({ error: "Unauthorized" }) };
    throw new Error("Unexpected request");
  };
}

test("public staging smoke test accepts verified read-only and writable modes", async () => {
  for (const readOnly of [true, false]) {
    const value = await inspectStagingSite("https://woffu-v2.netlify.app", mockFetch({
      preview: true,
      stagingConnected: true,
      blockedDatabase: false,
      readOnly,
      reason: readOnly ? "read-only" : "staging-ready",
    }));
    assert.equal(value.readOnly, readOnly);
  }
});

test("public staging smoke test rejects production or misconfigured staging", async () => {
  for (const mode of [
    { preview: false, stagingConnected: true, blockedDatabase: false, readOnly: false, reason: "production" },
    { preview: true, stagingConnected: false, blockedDatabase: true, readOnly: true, reason: "staging-required" },
  ]) {
    await assert.rejects(inspectStagingSite("https://woffu-v2.netlify.app", mockFetch(mode)));
  }
});

test("staging readiness fails when public endpoints leak private data", async () => {
  const safeMode = {
    preview: true, stagingConnected: true, blockedDatabase: false,
    readOnly: true, reason: "read-only",
  };
  await assert.rejects(inspectStagingSite(
    "https://woffu-v2.netlify.app",
    mockFetch(safeMode, { "/api/me": { status: 200, json: async () => ({ user: { id: "leak" } }) } })
  ));
  await assert.rejects(inspectStagingSite(
    "https://woffu-v2.netlify.app",
    mockFetch(safeMode, { "/api/projects": { status: 200, json: async () => ({ data: [{ id: "leak" }] }) } })
  ));
  for (const path of ["/api/members", "/api/dashboard"]) {
    await assert.rejects(inspectStagingSite(
      "https://woffu-v2.netlify.app",
      mockFetch(safeMode, { [path]: { status: 200, json: async () => ({ data: [{ id: "leak" }] }) } })
    ));
  }
});
