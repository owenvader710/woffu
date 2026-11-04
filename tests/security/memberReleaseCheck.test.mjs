import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../app/release-check/page.tsx", import.meta.url), "utf8");

test("release check runs exclusively on verified staging with active member", () => {
  assert.match(source, /mode\?\.preview !== true \|\| mode\?\.stagingConnected !== true/);
  assert.match(source, /profile\?\.role !== "MEMBER" \|\| profile\?\.is_active !== true/);
});

test("release check uses only invalid empty writes and expects HTTP 403", () => {
  assert.match(source, /url: "\/api\/approvals", expected: 403/);
  assert.match(source, /url: "\/api\/projects", expected: 403/);
  assert.match(source, /url: "\/api\/invites", expected: 403/);
  assert.match(source, /body: "{}"/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|document\.cookie|Authorization|access_token/);
});
