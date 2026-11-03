import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../app/api/projects/route.ts", import.meta.url), "utf8");
const post = source.slice(source.indexOf("export async function POST("));

test("project creation requires active manager before parsing or writing", () => {
  assert.match(post, /await requireActiveManager\(\)/);
  assert.match(post, /if \(access\.response\) return access\.response;/);
  assert.match(post, /const user = access\.user;/);
  assert.ok(post.indexOf("if (access.response)") < post.indexOf("await req.json()"));
});

test("project creation rejects nulls, arrays and scalar request bodies", () => {
  assert.match(post, /typeof body !== "object" \|\| Array\.isArray\(body\)/);
  assert.match(post, /const fields = body as Record<string, unknown>;/);
});

test("service-role client only exists in optional assignment notification path", () => {
  const first = post.indexOf("createSupabaseAdmin()");
  const optionalPath = post.indexOf("if (insertedData?.assignee_id)");
  assert.ok(optionalPath > -1 && first > optionalPath);
  assert.ok(first > post.indexOf(".from(\"projects\")"));
});
