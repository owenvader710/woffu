import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("dashboard loads active teammates from the actual profiles table", () => {
  const source = readFileSync(new URL("../../app/api/dashboard/route.ts", import.meta.url), "utf8");
  assert.match(source, /\.from\("profiles"\)\s*\.select\("id, display_name, department, role, is_active"\)/);
  assert.doesNotMatch(source, /\.from\("members"\)/);
});

test("team directory checks active-session access before reading profiles", () => {
  const source = readFileSync(new URL("../../app/api/members/route.ts", import.meta.url), "utf8");
  assert.match(source, /await requireActiveUser\(\)/);
  assert.match(source, /if \(access\.response\) return access\.response;/);
});
