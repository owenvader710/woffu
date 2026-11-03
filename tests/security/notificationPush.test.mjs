import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { normalizeInternalNotificationPath } from "../../lib/notificationUrl.ts";

test("internal Push links stay on the WOFFU origin", () => {
  assert.equal(normalizeInternalNotificationPath("/projects/a#draft-reviews"),
    "/projects/a#draft-reviews");
  assert.equal(normalizeInternalNotificationPath("/my-work?filter=TODO"), "/my-work?filter=TODO");
  for (const bad of [
    "https://evil.example/steal",
    "javascript:alert(1)",
    "//evil.example",
    "/\\evil.example",
    "/projects\u000A/path",
    5, null, undefined, "", "x".repeat(2100),
  ]) {
    assert.equal(normalizeInternalNotificationPath(bad), "/notifications");
  }
});

test("service worker neither displays nor opens an external Push link", async () => {
  const handlers = new Map();
  const notifications = [];
  const navigations = [];
  const self = {
    location: { origin: "https://staging.woffu.example" },
    registration: {
      async showNotification(title, options) {
        notifications.push({ title, options });
      },
    },
    clients: {
      async matchAll() { return [{
        async navigate(path) { navigations.push(path); },
        async focus() { return true; },
      }]; },
      async openWindow(path) { navigations.push(path); },
    },
    addEventListener(name, fn) { handlers.set(name, fn); },
  };
  vm.runInNewContext(readFileSync("public/sw.js", "utf8"), { self, URL });
  const push = handlers.get("push");
  const click = handlers.get("notificationclick");
  assert.equal(typeof push, "function");
  assert.equal(typeof click, "function");

  let pending = Promise.resolve();
  push({
    data: { json: () => ({ title: "QC", body: "Draft 2", url: "//evil.example" }) },
    waitUntil(promise) { pending = promise; },
  });
  await pending;
  assert.equal(notifications[0].options.data.url, "/notifications");
  assert.equal(notifications[0].title, "QC");

  click({
    notification: { data: { url: "https://evil.example/steal" }, close() {} },
    waitUntil(promise) { pending = promise; },
  });
  await pending;
  assert.deepEqual(navigations, ["/notifications"]);

  click({
    notification: { data: { url: "/projects/123#draft-reviews" }, close() {} },
    waitUntil(promise) { pending = promise; },
  });
  await pending;
  assert.deepEqual(navigations, ["/notifications", "/projects/123#draft-reviews"]);
});
