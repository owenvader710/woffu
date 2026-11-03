import test from "node:test";
import assert from "node:assert/strict";
import { buildActionCenter } from "../../lib/actionCenter.ts";

const now = Date.parse("2026-11-03T03:00:00.000Z");
const leader = "10000000-0000-4000-8000-000000000001";
const editor = "10000000-0000-4000-8000-000000000002";
const reviewer = "10000000-0000-4000-8000-000000000003";
const unrelated = "10000000-0000-4000-8000-000000000004";

function project(id, extra = {}) {
  return {
    id, title: `งาน ${id}`, code: "VID-001", brand: "IRONTEC",
    status: "IN_PROGRESS", assignee_id: editor, reviewer_id: reviewer,
    due_date: null, created_at: "2026-11-01T03:00:00Z", ...extra,
  };
}
function review(id, project_id, draft_number, review_status, feedback = null) {
  return {
    id, project_id, draft_number, review_status, feedback,
    created_at: `2026-11-0${draft_number}T03:00:00Z`,
  };
}
function build({ projects, reviews = [], approvals = [], viewerId = editor, isManager = false }) {
  return buildActionCenter({ projects, reviews, approvals, viewerId, isManager, nowMs: now });
}

test("assignee gets revision feedback, not a task to QC their own work", () => {
  const x = build({
    projects: [project("one")],
    reviews: [review("a", "one", 1, "CHANGES_REQUESTED", "แก้ Subtitle")],
  });
  assert.equal(x.counts.REVISION, 1);
  assert.equal(x.counts.QC, 0);
  assert.match(x.items[0].description, /Subtitle/);
  assert.equal(x.items[0].href, "/projects/one#draft-reviews");
});

test("reviewer sees submitted QC, but unrelated member sees no actions", () => {
  const work = project("two");
  const pending = review("b", "two", 1, "SUBMITTED");
  const reviewerResult = build({ projects: [work], reviews: [pending], viewerId: reviewer });
  assert.deepEqual(reviewerResult.items.map(item => item.kind), ["QC"]);
  const unrelatedResult = build({ projects: [work], reviews: [pending], viewerId: unrelated });
  assert.equal(unrelatedResult.items.length, 0);
});

test("only the newest Draft controls the current QC task", () => {
  const old = review("older", "three", 1, "CHANGES_REQUESTED", "old feedback");
  const newer = review("newer", "three", 2, "SUBMITTED");
  const submitter = build({ projects: [project("three")], reviews: [old, newer] });
  const senior = build({ projects: [project("three")], reviews: [newer, old], viewerId: reviewer });
  assert.equal(submitter.counts.REVISION, 0);
  assert.equal(senior.counts.QC, 1);
  assert.equal(senior.items[0].label, "ตรวจ Draft 2");
});

test("manager can act on approvals, pending QC, and revision followup", () => {
  const x = build({
    projects: [project("a"), project("b")],
    reviews: [review("a1", "a", 1, "SUBMITTED"), review("b1", "b", 1, "CHANGES_REQUESTED")],
    approvals: [{ id: "req1", project_id: "a", to_status: "COMPLETED", created_at: "2026-11-02T00:00:00Z" }],
    viewerId: leader, isManager: true,
  });
  assert.equal(x.counts.QC, 1);
  assert.equal(x.counts.REVISION, 1);
  assert.equal(x.counts.APPROVAL, 1);
  assert.ok(x.items.find(item => item.id === "APPROVAL:req1"));
  assert.equal(x.items.find(item => item.kind === "APPROVAL").href, "/approvals");
});

test("overdue tasks rank first; blocked tasks do not duplicate deadline reminders", () => {
  const p = [
    project("soon", { due_date: "2026-11-04T03:00:00Z" }),
    project("overdue", { due_date: "2026-11-01T03:00:00Z" }),
    project("blocked", { status: "BLOCKED", due_date: "2026-10-31T03:00:00Z" }),
  ];
  const x = build({ projects: p });
  assert.deepEqual(x.items.map(item => item.kind), ["OVERDUE", "BLOCKED", "DUE_SOON"]);
  assert.equal(x.counts.OVERDUE, 1);
  assert.equal(x.counts.BLOCKED, 1);
});

test("completed work, dates outside 72 hours and malformed dates are ignored", () => {
  const x = build({ projects: [
    project("completed", { status: "COMPLETED", due_date: "2026-11-01T03:00:00Z" }),
    project("later", { due_date: "2026-11-08T03:00:00Z" }),
    project("invalid", { due_date: "unparseable" }),
  ]});
  assert.deepEqual(x.items, []);
  assert.equal(x.counts.DUE_SOON, 0);
});

test("the 72-hour deadline boundary is included exactly", () => {
  const x = build({ projects: [
    project("edge", { due_date: "2026-11-06T03:00:00Z" }),
    project("past-edge", { due_date: "2026-11-06T03:00:01Z" }),
  ]});
  assert.deepEqual(x.items.map(item => item.projectId), ["edge"]);
});

test("manager approvals are deduplicated by request ID and scope to known projects", () => {
  const req = { id: "req2", project_id: "a", to_status: "BLOCKED", created_at: "2026-11-02T00:00:00Z" };
  const x = build({
    projects: [project("a")],
    approvals: [req, req, { ...req, id: "req3", project_id: "missing" }],
    viewerId: leader, isManager: true,
  });
  assert.equal(x.counts.APPROVAL, 1);
});

test("a member selected as reviewer does not get overdue tasks for another person's project", () => {
  const x = build({
    projects: [project("a", { due_date: "2026-10-30T03:00:00Z" })],
    viewerId: reviewer,
  });
  assert.equal(x.counts.OVERDUE, 0);
});
