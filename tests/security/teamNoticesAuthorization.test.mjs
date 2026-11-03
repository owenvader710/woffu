import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../../app/api/team-notices/route.ts", import.meta.url), "utf8"
);

test("both reading and posting notices require an active account", () => {
  const get = source.slice(source.indexOf("export async function GET()"), source.indexOf("export async function POST("));
  const post = source.slice(source.indexOf("export async function POST("));
  for (const section of [get, post]) {
    assert.match(section, /await requireActiveUser\(\)/);
    assert.match(section, /if \(access\.response\) return access\.response;/);
  }
});

test("admin client is created only after role and active-account authorization", () => {
  const post = source.slice(source.indexOf("export async function POST("));
  const authPosition = post.indexOf("if (access.response) return access.response;");
  const adminPosition = post.indexOf("createSupabaseAdmin()");
  assert.ok(authPosition >= 0 && adminPosition > authPosition);
  assert.match(post, /access\.profile\.role === "LEADER"/);
});

test("notice creation validates input before privileged insert", () => {
  const post = source.slice(source.indexOf("export async function POST("));
  assert.match(post, /parseNoticeInput\(body, isLeader\)/);
  assert.ok(post.indexOf("parseNoticeInput(body, isLeader)") < post.indexOf('.from("team_notices")'));
});
