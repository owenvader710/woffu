import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const envScript = fileURLToPath(new URL("../../scripts/check-staging-env.mjs", import.meta.url));
const siteScript = fileURLToPath(new URL("../../scripts/check-staging-site.mjs", import.meta.url));
const run = (script, args = [], env = {}) => spawnSync(process.execPath, [script, ...args], {
  encoding: "utf8", timeout: 10000,
  env: { ...process.env, ...env },
});

test("CLI preflight runs with complete staging settings, without exposing keys", () => {
  const secret = "private-only-test-key";
  const out = run(envScript, [], {
    WOFFU_DEPLOYMENT_MODE: "staging",
    NEXT_PUBLIC_SUPABASE_URL: "https://xofndnlyqueyuqyweqyi.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-test-key",
    SUPABASE_SERVICE_ROLE_KEY: secret,
    NEXT_PUBLIC_SITE_URL: "https://woffu-v2.netlify.app",
    WOFFU_ENABLE_PREVIEW_MUTATIONS: "false",
  });
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /PASS: staging environment/);
  assert.doesNotMatch(out.stdout + out.stderr, /private-only-test-key/);
});

test("CLI preflight refuses misconfigured environment", () => {
  const out = run(envScript, [], {
    WOFFU_DEPLOYMENT_MODE: "production",
    NEXT_PUBLIC_SUPABASE_URL: "https://egxhmruqubaxuyxefwqa.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    SUPABASE_SERVICE_ROLE_KEY: "",
    NEXT_PUBLIC_SITE_URL: "https://example.invalid",
    WOFFU_ENABLE_PREVIEW_MUTATIONS: "false",
  });
  assert.equal(out.status, 1);
  assert.match(out.stderr, /ERROR:/);
});

test("site smoke CLI refuses an unsafe URL without network access", () => {
  const out = run(siteScript, ["http://example.invalid"]);
  assert.equal(out.status, 1);
  assert.match(out.stderr, /FAIL: staging not ready/);
});
