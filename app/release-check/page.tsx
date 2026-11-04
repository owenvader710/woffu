"use client";

import { useState } from "react";

type Check = { label: string; expected: number; actual: number | null; passed: boolean };

const checks = [
  { label: "MEMBER cannot read leader approval queue", method: "GET", url: "/api/approvals", expected: 403 },
  { label: "MEMBER cannot create a project", method: "POST", url: "/api/projects", expected: 403 },
  { label: "MEMBER cannot invite team members", method: "POST", url: "/api/invites", expected: 403 },
] as const;

export default function MemberApiReleaseCheck() {
  const [results, setResults] = useState<Check[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setResults([]);
    setMessage("");
    try {
      const modeResponse = await fetch("/api/runtime-mode", { cache: "no-store" });
      const mode = await modeResponse.json().catch(() => null);
      if (!modeResponse.ok || mode?.preview !== true || mode?.stagingConnected !== true) {
        setMessage("Security checks run only on verified WOFFU Staging.");
        return;
      }

      const profileResponse = await fetch("/api/me-profile", { cache: "no-store" });
      const profileJson = await profileResponse.json().catch(() => null);
      const profile = profileJson?.data;
      if (!profileResponse.ok || profile?.role !== "MEMBER" || profile?.is_active !== true) {
        setMessage("Sign in using an active MEMBER account before running this check.");
        return;
      }

      const outcomes: Check[] = [];
      for (const check of checks) {
        // Empty JSON is intentionally invalid for privileged create endpoints.
        // An authorization failure must happen before validation or any write.
        const response = await fetch(check.url, {
          method: check.method,
          cache: "no-store",
          credentials: "same-origin",
          ...(check.method === "POST" ? {
            headers: { "Content-Type": "application/json" },
            body: "{}",
          } : {}),
        });
        outcomes.push({
          label: check.label,
          expected: check.expected,
          actual: response.status,
          passed: response.status === check.expected,
        });
      }
      setResults(outcomes);
    } catch {
      setMessage("Could not complete the checks. Check your network and session.");
    } finally {
      setBusy(false);
    }
  }

  const done = results.length === checks.length;
  const passed = done && results.every(item => item.passed);

  return (
    <main className="min-h-screen bg-[#0e1011] px-5 py-10 text-white">
      <section className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-[#191b1d] p-6 sm:p-8">
        <p className="text-xs font-bold tracking-widest text-[#e5ff78]">WOFFU OS V2 / STAGING ONLY</p>
        <h1 className="mt-3 text-2xl font-bold">Member API release check</h1>
        <p className="mt-3 text-sm leading-7 text-white/65">
          Use an active MEMBER session. This verifies that leader-only HTTP endpoints return
          Forbidden (403). It does not change any projects, invitations, or member records.
          No password or access token is collected or displayed.
        </p>
        <button type="button" onClick={run} disabled={busy}
          className="mt-6 rounded-xl bg-[#e5ff78] px-5 py-3 text-sm font-bold text-black disabled:opacity-50">
          {busy ? "Checking..." : "Run permission checks"}
        </button>
        {message && <p role="alert" className="mt-5 text-sm text-amber-200">{message}</p>}
        {done && (
          <div className="mt-6 space-y-3" role="status">
            <h2 className={passed ? "font-bold text-[#e5ff78]" : "font-bold text-red-300"}>
              {passed ? "PASS — all three endpoint checks" : "NOT PASSED — investigate statuses below"}
            </h2>
            {results.map(item => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                <p>{item.passed ? "PASS" : "FAIL"} — {item.label}</p>
                <p className="mt-1 text-white/55">HTTP {item.actual ?? "network error"} (expected {item.expected})</p>
              </div>
            ))}
            <p className="text-xs text-white/50">Share only the PASS/FAIL result and HTTP status codes.</p>
          </div>
        )}
      </section>
    </main>
  );
}
