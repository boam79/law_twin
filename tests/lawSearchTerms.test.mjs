import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isGarbageLawQuery,
  isLawLikeSearchQuery,
  lawTitlesMatch,
  scoreLawTitleForQuery,
} from "../lib/lawSearchTerms.js";

describe("lawSearchTerms", () => {
  it("isGarbageLawQuery rejects meaningless law phrases", () => {
    assert.equal(isGarbageLawQuery("그냥 법"), true);
    assert.equal(isGarbageLawQuery("근로기준법"), false);
  });

  it("isLawLikeSearchQuery accepts official law names", () => {
    assert.equal(isLawLikeSearchQuery("산업안전보건법"), true);
    assert.equal(isLawLikeSearchQuery("카페 오픈"), false);
  });

  it("lawTitlesMatch handles aliases", () => {
    assert.equal(lawTitlesMatch("전자상거래 등에서의 소비자보호에 관한 법률", "전자상거래법"), true);
    assert.equal(lawTitlesMatch("행정절차법", "근로기준법"), false);
  });

  it("scoreLawTitleForQuery ranks exact titles highest", () => {
    const exact = scoreLawTitleForQuery("근로기준법", "근로기준법");
    const partial = scoreLawTitleForQuery("근로기준법 시행령", "근로기준법");
    assert.ok(exact >= partial);
    assert.ok(exact >= 100);
  });
});
