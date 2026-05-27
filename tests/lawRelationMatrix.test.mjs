import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildLawRelationMatrix } from "../lib/lawRelationMatrix.js";

describe("buildLawRelationMatrix", () => {
  it("returns empty matrix when no laws", () => {
    const matrix = buildLawRelationMatrix({ laws: [], graph: { edges: [] }, conflicts: [] });
    assert.deepEqual(matrix, { laws: [], cells: [] });
  });

  it("builds square cells for deduped laws", () => {
    const matrix = buildLawRelationMatrix({
      laws: [
        { id: "a", title: "근로기준법", agency: "고용", relations: [] },
        { id: "b", title: "최저임금법", agency: "고용", relations: [] },
      ],
      graph: { edges: [] },
      conflicts: [],
    });
    assert.equal(matrix.laws.length, 2);
    assert.equal(matrix.cells.length, 2);
    assert.equal(matrix.cells[0].length, 2);
    assert.equal(matrix.cells[0][0].level, "self");
  });
});
