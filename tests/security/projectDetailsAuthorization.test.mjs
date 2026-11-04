import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("project detail GET requires an active user before querying project", () => {
  const source = readFileSync(new URL("../../app/api/projects/[id]/route.ts", import.meta.url), "utf8");
  const getStart = source.indexOf("export async function GET(");
  const patchStart = source.indexOf("export async function PATCH(", getStart);
  const getBody = source.slice(getStart, patchStart);
  assert.ok(getStart >= 0 && patchStart > getStart);
  assert.match(getBody, /await requireActiveUser\(\)/);
  assert.match(getBody, /if \(access\.response\) return access\.response;/);
  assert.ok(getBody.indexOf("await requireActiveUser()") < getBody.indexOf('.from("projects")'));
  assert.doesNotMatch(getBody, /createSupabaseServer/);
});

test("project modification remains restricted to managers", () => {
  const source = readFileSync(new URL("../../app/api/projects/[id]/route.ts", import.meta.url), "utf8");
  const patch = source.slice(source.indexOf("export async function PATCH("), source.indexOf("export async function DELETE("));
  const remove = source.slice(source.indexOf("export async function DELETE("));
  assert.match(patch, /await requireActiveManager\(\)/);
  assert.match(remove, /await requireActiveManager\(\)/);
});
