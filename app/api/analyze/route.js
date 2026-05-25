import { analyzeScenario, hydrateAnalysisWithLiveLaws } from "../../../lib/analyzer";
import { planLawSearchWithGemini, summarizeWithGemini } from "../../../lib/gemini";
import { fetchLawSearchBatch } from "../../../lib/lawApi";

export const runtime = "nodejs";
export const preferredRegion = "icn1";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const body = await request.json();
  const scenario = String(body.scenario || "");
  const analysis = analyzeScenario({
    scenario,
    sector: body.sector || "auto",
    region: body.region || "auto",
    mode: body.mode || "impact",
  });

  const lawSearchPlan = await planLawSearchWithGemini({ scenario, analysis });
  const searchQueries = mergeQueries(lawSearchPlan.queries, analysis.searchQueries);
  const lawApi = await fetchLawSearchBatch(searchQueries);
  const plannedAnalysis = { ...analysis, searchQueries };
  const hydratedAnalysis = hydrateAnalysisWithLiveLaws(plannedAnalysis, lawApi, body.mode || "impact");
  const gemini = await summarizeWithGemini({ scenario, analysis: hydratedAnalysis, lawApi });

  return Response.json({
    ...hydratedAnalysis,
    lawApi,
    lawSearchPlan,
    gemini,
    integrations: {
      gemini: gemini.enabled,
      lawApi: lawApi.enabled,
    },
    runtime: {
      region: process.env.VERCEL_REGION || "local",
    },
  });
}

function mergeQueries(primary, fallback) {
  return [...new Set([...(primary || []), ...(fallback || [])].map((query) => String(query || "").trim()).filter(Boolean))].slice(0, 8);
}

export async function GET() {
  return Response.json({
    ok: true,
    integrations: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      lawApi: Boolean(process.env.LAW_API_KEY),
    },
    runtime: {
      region: process.env.VERCEL_REGION || "local",
      preferredRegion,
    },
  });
}
