import test from "node:test";
import assert from "node:assert/strict";
import { parseNoticeInput } from "../../lib/teamNoticeInput.ts";

test("accepts simple notice and retains pinning for leaders only", () => {
  const payload = { title: "  งานถ่ายสินค้า  ", content: "  นัดหมายพรุ่งนี้  ", is_pinned: true };
  assert.deepEqual(parseNoticeInput(payload, true), {
    title: "งานถ่ายสินค้า", content: "นัดหมายพรุ่งนี้",
    notice_type: "GENERAL", attachment_url: null, attachment_name: null, is_pinned: true,
  });
  assert.equal(parseNoticeInput(payload, false)?.is_pinned, false);
});
test("accepts HTTPS storage and shared Drive attachment", () => {
  const result = parseNoticeInput({
    title: "Draft", content: "", notice_type: "urgent",
    attachment_url: "https://drive.google.com/file/d/example/view",
    attachment_name: "brief.pdf",
  }, false);
  assert.equal(result?.notice_type, "URGENT");
  assert.equal(result?.attachment_url, "https://drive.google.com/file/d/example/view");
  assert.equal(result?.attachment_name, "brief.pdf");
});
test("rejects malformed content and oversized announcements", () => {
  const invalid = [
    null, [], "text", {}, { title: 8 }, { title: "" },
    { title: "x".repeat(161) }, { title: "fine", content: {} },
    { title: "fine", content: "x".repeat(10001) },
    { title: "fine", attachment_name: "report.pdf" },
    { title: "fine", attachment_url: "https://example.com", attachment_name: 42 },
    { title: "fine", attachment_url: "https://example.com", attachment_name: "x".repeat(256) },
  ];
  for (const value of invalid) assert.equal(parseNoticeInput(value, true), null);
});
test("rejects unsafe attachment URLs", () => {
  const urls = [
    "javascript:alert(1)", "data:text/html,boom", "http://example.com/a",
    "//example.com/a", "https://user:password@example.com/file",
    "https://example.com@evil.test/file", "https://example.com/".repeat(200),
  ];
  for (const url of urls) {
    const result = parseNoticeInput({ title: "Link", attachment_url: url }, true);
    if (url === "https://example.com@evil.test/file") {
      assert.equal(result, null, "userinfo must be rejected");
    } else {
      assert.equal(result, null, url);
    }
  }
});
