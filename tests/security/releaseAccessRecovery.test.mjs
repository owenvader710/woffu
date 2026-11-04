import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("manager-only approval endpoints verify an active LEADER or ADMIN", () => {
  const shared = read("app/api/_approvalAction.ts");
  assert.match(shared, /await requireActiveManager\(\)/);
  assert.match(shared, /if \(access\.response\) return access\.response/);
  const approvalList = read("app/api/approvals/route.ts");
  assert.match(approvalList, /isLeaderRole\(me\.role\)/);
  assert.match(approvalList, /me\.is_active === false/);
});

test("member-management writes cannot elevate an ordinary MEMBER", () => {
  const member = read("app/api/members/[id]/route.ts");
  assert.match(member, /const manager = access\.profile\.role === "LEADER" \|\| access\.profile\.role === "ADMIN"/);
  assert.match(member, /if \(!manager && !isSelf\)/);
  assert.match(member, /\? \["display_name", "phone", "birth_date", "role", "department", "is_active", "email"\]/);
  assert.match(member, /: \["display_name", "phone", "birth_date"\]/);
});

test("account recovery uses trusted website origin and fixed callback", () => {
  const forgot = read("app/api/auth/forgot-password/route.ts");
  const confirm = read("app/auth/confirm/route.ts");
  assert.match(forgot, /getTrustedSiteOrigin\(/);
  assert.match(forgot, /new URL\("\/auth\/confirm", siteOrigin\)/);
  assert.match(forgot, /resetPasswordForEmail\(email/);
  assert.match(confirm, /exchangeCodeForSession\(code\)/);
  assert.match(confirm, /"\/reset-password"/);
  assert.match(confirm, /"\/forgot-password\?error=invalid_link"/);
  assert.doesNotMatch(forgot, /localhost:3000/);
});

test("password reset requires a verified session and logs out after success", () => {
  const reset = read("app/api/auth/reset-password/route.ts");
  assert.match(reset, /await supabase\.auth\.getUser\(\)/);
  assert.match(reset, /if \(authError \|\| !data\.user\)/);
  assert.match(reset, /await supabase\.auth\.updateUser\(\{ password \}\)/);
  assert.match(reset, /await supabase\.auth\.signOut\(\)/);
});
