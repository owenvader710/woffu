import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../app/api/invites/route.ts", import.meta.url), "utf8");

test("leader authentication is checked before creating privileged invite client", () => {
  const check = source.indexOf('if (me.role !== "LEADER")');
  const admin = source.indexOf("const admin = createSupabaseAdmin()");
  assert.ok(check >= 0 && admin > check);
});

test("invite links use configured trusted origin rather than request Host", () => {
  assert.match(source, /getTrustedSiteOrigin\(/);
  assert.match(source, /const inviteLink = `\$\{siteOrigin\}\/invite\/\$\{rawToken\}`/);
  assert.doesNotMatch(source, /const baseUrl =/);
  assert.match(source, /if \(!siteOrigin\)/);
});
