import { describe, expect, it } from "vitest";

import {
  createLocalPasswordHash,
  verifyLocalPassword,
} from "./_core/localAuth";

describe("local auth password hash", () => {
  it("verifies a generated password hash", () => {
    const password = "my-strong-password";
    const hash = createLocalPasswordHash(password);

    expect(verifyLocalPassword(password, hash)).toBe(true);
  });

  it("rejects an invalid password", () => {
    const hash = createLocalPasswordHash("correct-password");

    expect(verifyLocalPassword("wrong-password", hash)).toBe(false);
  });

  it("rejects malformed hash values", () => {
    expect(verifyLocalPassword("password", "invalid-format")).toBe(false);
  });
});
