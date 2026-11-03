import test from "node:test";
import assert from "node:assert/strict";
import {
  WOFFU_STAGING_PROJECT_REF,
  getDeploymentSafety,
  isVerifiedStagingUrl,
  isUnsafeMethod,
} from "../../lib/stagingSafety.ts";

const staging = `https://${WOFFU_STAGING_PROJECT_REF}.supabase.co`;
const production = "https://egxhmruqubaxuyxefwqa.supabase.co";

test("only the exact HTTPS staging Supabase project URL is trusted", () => {
  assert.equal(isVerifiedStagingUrl(staging), true);
  for (const url of [
    production,
    "http://" + WOFFU_STAGING_PROJECT_REF + ".supabase.co",
    staging + ".attacker.example",
    staging + "/rest/v1",
    staging + "?token=abc",
    "https://" + WOFFU_STAGING_PROJECT_REF + ".supabase.co@other.example",
    "https://xofndnlyqueyuqyweqyi-supabase.co",
    "",
    "invalid",
  ]) {
    assert.equal(isVerifiedStagingUrl(url), false, url);
  }
});

test("Vercel Preview with Production database is blocked even if writes enabled", () => {
  const state = getDeploymentSafety({
    VERCEL_ENV: "preview",
    WOFFU_ENABLE_PREVIEW_MUTATIONS: "true",
    NEXT_PUBLIC_SUPABASE_URL: production,
  });
  assert.equal(state.blockedDatabase, true);
  assert.equal(state.readOnly, true);
  assert.equal(state.reason, "staging-required");
});

test("Vercel Preview with verified staging defaults to read-only", () => {
  const state = getDeploymentSafety({
    VERCEL_ENV: "preview",
    NEXT_PUBLIC_SUPABASE_URL: staging,
  });
  assert.equal(state.blockedDatabase, false);
  assert.equal(state.stagingConnected, true);
  assert.equal(state.readOnly, true);
});

test("Vercel Preview can mutate only after verifying staging and explicit opt in", () => {
  const state = getDeploymentSafety({
    VERCEL_ENV: "preview",
    NEXT_PUBLIC_SUPABASE_URL: staging,
    WOFFU_ENABLE_PREVIEW_MUTATIONS: "true",
  });
  assert.equal(state.blockedDatabase, false);
  assert.equal(state.readOnly, false);
  assert.equal(state.reason, "staging-ready");
});

test("new Netlify Free sites fail closed even without environment mode flag", () => {
  const blocked = getDeploymentSafety({
    NETLIFY: "true",
    NEXT_PUBLIC_SUPABASE_URL: production,
    WOFFU_ENABLE_PREVIEW_MUTATIONS: "true",
  });
  assert.equal(blocked.blockedDatabase, true);
  const allowed = getDeploymentSafety({
    NETLIFY: "true",
    WOFFU_DEPLOYMENT_MODE: "staging",
    NEXT_PUBLIC_SUPABASE_URL: staging,
    WOFFU_ENABLE_PREVIEW_MUTATIONS: "true",
  });
  assert.equal(allowed.readOnly, false);
});

test("production and local development do not gain staging constraints", () => {
  for (const env of [{}, { VERCEL_ENV: "production" }, { WOFFU_DEPLOYMENT_MODE: "production", NETLIFY: "true" }]) {
    const state = getDeploymentSafety(env);
    assert.equal(state.preview, false);
    assert.equal(state.blockedDatabase, false);
  }
});

test("write method classification is exact", () => {
  assert.equal(isUnsafeMethod("GET"), false);
  assert.equal(isUnsafeMethod("head"), false);
  assert.equal(isUnsafeMethod("OPTIONS"), false);
  assert.equal(isUnsafeMethod("POST"), true);
  assert.equal(isUnsafeMethod("PATCH"), true);
  assert.equal(isUnsafeMethod("DELETE"), true);
});
