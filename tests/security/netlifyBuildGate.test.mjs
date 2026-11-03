import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkStagingEnvironment } from "../../scripts/check-staging-env.mjs";

test("Netlify build requires the staging environment preflight", () => {
  const config = readFileSync(new URL("../../netlify.toml", import.meta.url), "utf8");
  assert.match(config, /command = "node scripts\/check-staging-env\.mjs && npm run build"/);
});

test("preflight rejects missing keys and production endpoints", () => {
  const valid = {
    WOFFU_DEPLOYMENT_MODE: "staging",
    NEXT_PUBLIC_SUPABASE_URL: "https://xofndnlyqueyuqyweqyi.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "staging-test-public",
    SUPABASE_SERVICE_ROLE_KEY: "staging-test-secret",
    NEXT_PUBLIC_SITE_URL: "https://woffu-v2.netlify.app",
    WOFFU_ENABLE_PREVIEW_MUTATIONS: "false",
  };
  assert.equal(checkStagingEnvironment(valid).ok, true);
  assert.equal(checkStagingEnvironment({ ...valid, WOFFU_DEPLOYMENT_MODE: "production" }).ok, false);
  assert.equal(checkStagingEnvironment({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "https://egxhmruqubaxuyxefwqa.supabase.co" }).ok, false);
  assert.equal(checkStagingEnvironment({ ...valid, SUPABASE_SERVICE_ROLE_KEY: "" }).ok, false);
});
