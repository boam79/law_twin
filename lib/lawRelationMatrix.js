import { shortLabel } from "./shortLabel.js";

function baseLawTitle(title) {
  return String(title || "")
    .replace(/\s*시행령.*$/u, "")
    .replace(/\s*시행규칙.*$/u, "")
    .trim();
}

function dedupeLawsForMatrix(laws) {
  const seen = new Set();
  const result = [];

  laws.forEach((law) => {
    const base = baseLawTitle(law.title);
    if (seen.has(base)) return;
    seen.add(base);
    result.push({
      id: law.id,
      title: law.title,
      shortTitle: shortLabel(base, 14),
      agency: law.agency,
      matchedQuery: law.matchedQuery,
      relations: law.relations ?? [],
    });
  });

  return result;
}

function scoreLawRelation(lawA, lawB, context) {
  if (lawA.id === lawB.id) return { level: "self", label: "—", score: 0 };

  const edge = context.edges.find(
    (item) => (item.from === lawA.id && item.to === lawB.id) || (item.from === lawB.id && item.to === lawA.id),
  );
  if (edge?.type === "conflict") return { level: "high", label: "충돌", score: 3 };

  const relation = lawA.relations?.find(
    (item) => item.target === lawB.id || lawB.title.includes(item.target) || baseLawTitle(lawB.title).includes(item.target),
  );
  if (relation?.type === "tension") return { level: "high", label: "긴장", score: 3 };
  if (relation) return { level: "mid", label: "연관", score: 2 };

  const conflict = context.conflicts.find(
    (item) =>
      item.laws?.some((name) => lawA.title.includes(name) || name.includes(lawA.title)) &&
      item.laws?.some((name) => lawB.title.includes(name) || name.includes(lawB.title)),
  );
  if (conflict) {
    return { level: conflict.level === "high" ? "high" : "mid", label: "검토", score: conflict.level === "high" ? 3 : 2 };
  }

  if (lawA.agency && lawA.agency === lawB.agency && lawA.agency !== "소관부처 미확인") {
    return { level: "low", label: "동일 부처", score: 1 };
  }
  if (lawA.matchedQuery && lawA.matchedQuery === lawB.matchedQuery) {
    return { level: "low", label: "동일 검색", score: 1 };
  }

  return { level: "none", label: "", score: 0 };
}

export function buildLawRelationMatrix(analysis) {
  if (!analysis?.laws?.length) return { laws: [], cells: [] };

  const laws = dedupeLawsForMatrix(analysis.laws).slice(0, 7);
  const edges = analysis.graph?.edges ?? [];

  const cells = laws.map((rowLaw) =>
    laws.map((columnLaw) => scoreLawRelation(rowLaw, columnLaw, { edges, conflicts: analysis.conflicts ?? [] })),
  );

  return { laws, cells };
}
