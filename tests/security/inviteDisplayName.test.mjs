import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("invitation stores a valid operator-chosen display name", () => {
  const source=read("app/api/invites/route.ts");
  assert.match(source, /const displayName = typeof body\?\.display_name === "string" \? body\.display_name\.trim\(\) : ""/);
  assert.match(source, /!displayName \|\| displayName\.length > 120/);
  assert.match(source, /display_name: displayName/);
  const migration=read("supabase/migrations/202611040003_invitation_display_names.sql");
  assert.match(migration, /ADD COLUMN IF NOT EXISTS display_name text/);
  assert.match(migration, /char_length\(btrim\(display_name\)\) BETWEEN 1 AND 120/);
});

test("accepting a member invitation persists the specified name", () => {
  const source=read("app/api/invites/[token]/route.ts");
  assert.match(source, /select\("id, email, display_name, role, department, expires_at, used_at"\)/);
  assert.match(source, /select\("id, email, display_name, role, department"\)/);
  assert.match(source, /display_name: invite\.display_name \|\| invite\.email/);
  assert.match(source, /user_metadata: \{ display_name: invite\.display_name \|\| invite\.email \}/);
});

test("invitation UI requires name and confirms it on the acceptance page", () => {
  const members=read("app/(app)/members/page.tsx");
  const accept=read("app/invite/[token]/page.tsx");
  assert.match(members, /const \[inviteName, setInviteName\] = useState\(""/);
  assert.match(members, /display_name: inviteName\.trim\(\)/);
  assert.match(members, /disabled=\{inviteBusy \|\| !inviteName\.trim\(\) \|\| !inviteEmail\.trim\(\)\}/);
  assert.match(accept, /invite\.display_name \|\| "ยังไม่ได้กำหนดชื่อ"/);
});

test("existing leaders and members can update display names", () => {
  const member=read("app/api/members/[id]/route.ts");
  assert.match(member, /"display_name", "phone", "birth_date"/);
  assert.match(member, /patch\.display_name = name/);
});
