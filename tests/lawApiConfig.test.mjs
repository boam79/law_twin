import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getLawApiMaxQueries } from "../lib/lawApiConfig.js";

describe("getLawApiMaxQueries", () => {
  it("defaults to 8", () => {
    const previous = process.env.LAW_API_MAX_QUERIES;
    delete process.env.LAW_API_MAX_QUERIES;
    assert.equal(getLawApiMaxQueries(), 8);
    if (previous) process.env.LAW_API_MAX_QUERIES = previous;
  });

  it("caps at 16", () => {
    const previous = process.env.LAW_API_MAX_QUERIES;
    process.env.LAW_API_MAX_QUERIES = "99";
    assert.equal(getLawApiMaxQueries(), 16);
    if (previous) process.env.LAW_API_MAX_QUERIES = previous;
    else delete process.env.LAW_API_MAX_QUERIES;
  });
});
