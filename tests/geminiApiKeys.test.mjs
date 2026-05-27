import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { getGeminiApiKeys, isGeminiConfigured } from "../lib/security.js";

describe("getGeminiApiKeys", () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousKeys = process.env.GEMINI_API_KEYS;

  afterEach(() => {
    if (previousKey) process.env.GEMINI_API_KEY = previousKey;
    else delete process.env.GEMINI_API_KEY;
    if (previousKeys) process.env.GEMINI_API_KEYS = previousKeys;
    else delete process.env.GEMINI_API_KEYS;
  });

  it("merges GEMINI_API_KEY before GEMINI_API_KEYS without duplicates", () => {
    process.env.GEMINI_API_KEY = "primary";
    process.env.GEMINI_API_KEYS = "primary,backup";
    assert.deepEqual(getGeminiApiKeys(), ["primary", "backup"]);
    assert.equal(isGeminiConfigured(), true);
  });

  it("parses newline and semicolon separators", () => {
    delete process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEYS = "a\nb;c";
    assert.deepEqual(getGeminiApiKeys(), ["a", "b", "c"]);
  });

  it("returns empty when unset", () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEYS;
    assert.deepEqual(getGeminiApiKeys(), []);
    assert.equal(isGeminiConfigured(), false);
  });
});
