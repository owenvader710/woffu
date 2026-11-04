import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../app/api/my-work/route.ts", import.meta.url), "utf8");

test("My Work refuses suspended or missing profiles before reading projects", () => {
  const profileCheck = source.indexOf('select("is_active")');
  const activeCheck = source.indexOf("activeProfile.is_active !== true");
  const projectQuery = source.indexOf('.from("projects")');
  assert.ok(profileCheck > -1 && activeCheck > profileCheck && projectQuery > activeCheck);
  assert.match(source, /status: 403/);
  assert.match(source, /if \(profileError\)/);
});

test("My Work only reads the current account's assignments", () => {
  assert.match(source, /\.eq\("assignee_id", user\.id\)/);
});
