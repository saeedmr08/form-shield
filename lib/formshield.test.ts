import { describe, expect, it } from "vitest";
import {
  applyRetention,
  checkRateLimit,
  createSubmission,
  encryptSensitiveFields,
  isHoneypotTriggered,
  simulateDecrypt,
  simulateEncrypt,
  validateFields,
} from "./formshield";

describe("validateFields", () => {
  const rules = [
    { name: "email", required: true, email: true },
    { name: "message", required: true, minLength: 5, maxLength: 200 },
  ];

  it("passes valid input", () => {
    expect(
      validateFields({ email: "a@b.co", message: "hello there" }, rules),
    ).toEqual([]);
  });

  it("flags missing and invalid fields", () => {
    const issues = validateFields({ email: "nope", message: "hi" }, rules);
    expect(issues.map((i) => i.field).sort()).toEqual(["email", "message"]);
  });
});

describe("honeypot", () => {
  it("triggers when hidden field filled", () => {
    expect(isHoneypotTriggered({ website: "http://spam" })).toBe(true);
    expect(isHoneypotTriggered({ website: "" })).toBe(false);
  });
});

describe("rate limit", () => {
  it("allows within window then blocks", () => {
    const buckets = new Map();
    const now = 1_000_000;
    expect(checkRateLimit(buckets, "ip", 2, 60_000, now).allowed).toBe(true);
    expect(checkRateLimit(buckets, "ip", 2, 60_000, now + 1).allowed).toBe(true);
    expect(checkRateLimit(buckets, "ip", 2, 60_000, now + 2).allowed).toBe(false);
    expect(checkRateLimit(buckets, "ip", 2, 60_000, now + 60_000).allowed).toBe(true);
  });
});

describe("encryption simulation + retention", () => {
  it("encrypts and decrypts sensitive fields", () => {
    const enc = encryptSensitiveFields(
      { email: "a@b.co", note: "public" },
      ["email"],
      "demo-key",
    );
    expect(enc.note).toBe("public");
    expect(enc.email).not.toBe("a@b.co");
    expect(simulateDecrypt(enc.email!, "demo-key")).toBe("a@b.co");
    expect(simulateEncrypt("x", "k")).toBeTruthy();
  });

  it("purges expired submissions", () => {
    const store = new Map();
    const keep = createSubmission({ a: "1" }, 10_000, 1000);
    const drop = createSubmission({ a: "2" }, 100, 1000);
    store.set(keep.id, keep);
    store.set(drop.id, drop);
    expect(applyRetention(store, 1200)).toBe(1);
    expect(store.has(keep.id)).toBe(true);
    expect(store.has(drop.id)).toBe(false);
  });
});
