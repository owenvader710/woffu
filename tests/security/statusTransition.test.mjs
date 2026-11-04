import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const request = readFileSync(new URL("../../app/api/projects/[id]/request-status/route.ts", import.meta.url), "utf8");
const rpc = readFileSync(new URL("../../supabase/migrations/202611040001_prevent_skipping_in_progress.sql", import.meta.url), "utf8");

test("API rejects TODO to COMPLETED before inserting request", () => {
  const guard = request.indexOf('from_status === "TODO" && to_status === "COMPLETED"');
  const insert = request.indexOf('.from("status_change_requests")\n      .insert(');
  assert.ok(guard > 0, "missing direct-completion guard");
  assert.ok(insert > guard, "guard must precede database insert");
  assert.match(request, /code: "INVALID_TRANSITION"/);
});

test("atomic manager approval rejects direct completion", () => {
  assert.match(rpc, /v_request\.from_status = 'TODO' AND v_request\.to_status = 'COMPLETED'/);
  assert.match(rpc, /'code', 'INVALID_TRANSITION'/);
  assert.match(rpc, /IF v_action = 'APPROVE' THEN/);
});

test("database rejects new TODO-to-COMPLETED requests without deleting historical requests", () => {
  const sql = readFileSync(new URL("../../supabase/migrations/202611040002_restrict_direct_completion_requests.sql", import.meta.url), "utf8");
  assert.match(sql, /ADD CONSTRAINT status_requests_must_start_before_completion/);
  assert.match(sql, /from_status = 'TODO' AND to_status = 'COMPLETED'/);
  assert.match(sql, /NOT VALID/);
});
