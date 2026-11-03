import assert from "node:assert/strict";

const baseUrl = process.env.SAFE_PREVIEW_BASE_URL || "http://127.0.0.1:3187";
async function request(path, options = {}) {
  const response = await fetch(new URL(path, baseUrl), {
    redirect: "manual",
    signal: AbortSignal.timeout(9000),
    ...options,
  });
  return response;
}

// Next.js may need a few seconds to start serving.
for (let attempt = 0; attempt < 30; attempt++) {
  try {
    const probe = await request("/api/runtime-mode");
    if (probe.status === 200) break;
  } catch {}
  if (attempt === 29) throw new Error("Preview server failed to start");
  await new Promise(resolve => setTimeout(resolve, 1000));
}

const modeRes = await request("/api/runtime-mode");
assert.equal(modeRes.status, 200);
const mode = await modeRes.json();
assert.deepEqual(
  { preview: mode.preview, readOnly: mode.readOnly, blocked: mode.blockedDatabase },
  { preview: true, readOnly: true, blocked: true }
);

for (const [path, options] of [
  ["/api/notifications", {}],
  ["/api/action-center", {}],
  ["/api/projects", {}],
  ["/api/login", { method: "POST" }],
  ["/api/auth/forgot-password", { method: "POST" }],
  ["/api/auth/reset-password", { method: "POST" }],
  ["/api/status-requests", { method: "POST" }],
]) {
  const response = await request(path, options);
  assert.equal(response.status, 423, `${path} must remain blocked without isolated staging`);
  const data = await response.json();
  assert.equal(data.code, "STAGING_REQUIRED");
}

for (const path of ["/login", "/forgot-password", "/reset-password"]) {
  const response = await request(path);
  assert.equal(response.status, 200, `${path} must stay viewable on blocked Preview`);
  assert.match(await response.text(), /WOFFU/, "Visible auth page missing safety context");
}
const protectedPage = await request("/dashboard");
assert.ok([302, 303, 307, 308].includes(protectedPage.status));
assert.match(protectedPage.headers.get("location") || "", /\/login/);
console.log("PASS: Preview HTTP denies all Auth/Data APIs and keeps safe public pages visible");
