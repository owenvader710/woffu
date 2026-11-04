import test from "node:test";
import assert from "node:assert/strict";
import { parseLoginCredentials } from "../../lib/loginCredentials.ts";

test("accepts normal credentials and trims only email", () => {
  assert.deepEqual(parseLoginCredentials({
    email: "  editor@example.com  ",
    password: "  secret  ",
  }), { email: "editor@example.com", password: "  secret  " });
});

test("rejects missing, malformed and empty login input", () => {
  for (const input of [
    null, undefined, "", 42, true, [], ["x"], {}, 
    { email: "", password: "abc" },
    { email: "   ", password: "abc" },
    { email: "a@example.com", password: "" },
    { email: "a@example.com", password: null },
    { email: "a@example.com", password: {} },
    { email: [], password: "abc" },
    { email: "x".repeat(321), password: "abc" },
  ]) {
    assert.equal(parseLoginCredentials(input), null);
  }
});

test("maximum-length email is allowed", () => {
  const email = "x".repeat(320);
  assert.deepEqual(parseLoginCredentials({ email, password: "p" }), { email, password: "p" });
});
