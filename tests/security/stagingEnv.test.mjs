import test from "node:test";
import assert from "node:assert/strict";
import { checkStagingEnvironment } from "../../scripts/check-staging-env.mjs";

const valid = {
  WOFFU_DEPLOYMENT_MODE: "staging",
  NEXT_PUBLIC_SUPABASE_URL: "https://xofndnlyqueyuqyweqyi.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-public-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-server-only-key",
  NEXT_PUBLIC_SITE_URL: "https://woffu-v2.netlify.app",
  WOFFU_ENABLE_PREVIEW_MUTATIONS: "false",
};

test("staging read-only and writable settings are accepted", () => {
  assert.equal(checkStagingEnvironment(valid).ok, true);
  assert.equal(checkStagingEnvironment({ ...valid, WOFFU_ENABLE_PREVIEW_MUTATIONS: "true" }).ok, true);
});

test("preflight rejects unsafe and incomplete staging settings", () => {
  const changes = [
    { WOFFU_DEPLOYMENT_MODE: "production" },
    { NEXT_PUBLIC_SUPABASE_URL: "https://egxhmruqubaxuyxefwqa.supabase.co" },
    { NEXT_PUBLIC_SUPABASE_URL: "https://xofndnlyqueyuqyweqyi.supabase.co.attacker.test" },
    { NEXT_PUBLIC_SUPABASE_ANON_KEY: "" },
    { SUPABASE_SERVICE_ROLE_KEY: "" },
    { NEXT_PUBLIC_SITE_URL: "https://evil.example" },
    { NEXT_PUBLIC_SITE_URL: "https://woffu-v2.netlify.app/path" },
    { NEXT_PUBLIC_SITE_URL: "https://woffu-v2.netlify.app@attacker.example" },
    { WOFFU_ENABLE_PREVIEW_MUTATIONS: undefined },
  ];
  for (const change of changes) {
    const result = checkStagingEnvironment({ ...valid, ...change });
    assert.equal(result.ok, false, JSON.stringify(change));
    assert.ok(result.errors.length > 0);
  }
});

test("failure messages never disclose credential values", () => {
  const secret = "private-secret-for-test";
  const result = checkStagingEnvironment({
    ...valid, SUPABASE_SERVICE_ROLE_KEY: secret,
    NEXT_PUBLIC_SITE_URL: "https://invalid.example",
  });
  assert.equal(result.ok, false);
  assert.ok(!JSON.stringify(result).includes(secret));
});
