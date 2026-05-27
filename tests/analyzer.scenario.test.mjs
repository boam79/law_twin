import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analyzeScenario, buildEmergencySearchQueries } from "../lib/analyzer.js";
import { isLawLikeSearchQuery } from "../lib/lawSearchTerms.js";

describe("analyzeScenario", () => {
  it("maps workplace injury casual text to safety laws", () => {
    const analysis = analyzeScenario({
      scenario: "5인미만 사업체에서 대표가 근무 중 다쳤을 때",
      sector: "auto",
      region: "auto",
      mode: "impact",
    });

    assert.ok(analysis.laws.length >= 1, "expected at least one local law");
    assert.ok(
      analysis.searchQueries.some((q) => /산업안전|산업재해|근로기준/u.test(q)),
      `unexpected queries: ${analysis.searchQueries.join(", ")}`,
    );
    assert.ok(
      !analysis.searchQueries.some((q) => q === "행정절차법"),
      "should not default to admin procedure act",
    );
    assert.ok(analysis.conditions.topics.includes("safety") || analysis.conditions.topics.includes("labor"));
  });

  it("never returns empty search queries", () => {
    const analysis = analyzeScenario({
      scenario: "이상한 일이 생겼어",
      sector: "auto",
      region: "auto",
      mode: "impact",
    });
    assert.ok(analysis.searchQueries.length >= 1);
    assert.ok(analysis.searchQueries.every((q) => isLawLikeSearchQuery(q)));
  });
});

describe("buildEmergencySearchQueries", () => {
  it("adds topic fallbacks when primary queries are empty", () => {
    const conditions = { topics: ["labor", "safety"], sector: "workplace", region: "nationwide" };
    const emergency = buildEmergencySearchQueries(conditions, [], "공장에서 다쳤어");
    assert.ok(emergency.length >= 1);
  });
});
