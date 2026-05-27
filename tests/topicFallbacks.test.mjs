import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildEmergencySearchQueries,
  getTopicFallbackQueries,
  inferFallbackTopics,
} from "../lib/topicFallbacks.js";

describe("inferFallbackTopics", () => {
  it("detects workplace injury patterns", () => {
    const topics = inferFallbackTopics("5인미만 사업체에서 대표가 근무 중 다쳤을 때");
    assert.ok(topics.includes("safety"));
    assert.ok(topics.includes("labor"));
  });
});

describe("getTopicFallbackQueries", () => {
  it("skips permit for safety topics", () => {
    const queries = getTopicFallbackQueries({
      topics: ["safety", "labor"],
      sector: "workplace",
      region: "nationwide",
    });
    assert.ok(queries.some((q) => /산업안전|근로기준/u.test(q)));
    assert.ok(!queries.includes("행정절차법"));
  });
});

describe("buildEmergencySearchQueries", () => {
  it("returns safety-related fallbacks for injury text", () => {
    const emergency = buildEmergencySearchQueries(
      { topics: ["labor", "safety"], sector: "workplace", region: "nationwide" },
      [],
      "공장에서 다쳤어",
    );
    assert.ok(emergency.length >= 1);
  });
});
