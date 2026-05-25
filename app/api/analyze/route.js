import { analyzeScenario, hydrateAnalysisWithLiveLaws } from "../../../lib/analyzer";
import { planLawSearchWithGemini, summarizeWithGemini } from "../../../lib/gemini";
import { fetchLawSearchBatch } from "../../../lib/lawApi";
import { canonicalizeSearchQueries } from "../../../lib/lawSearchTerms";

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
    integrations: buildIntegrations({ lawSearchPlan, gemini, lawApi }),
    runtime: {
      region: process.env.VERCEL_REGION || "local",
    },
  });
}

function buildIntegrations({ lawSearchPlan, gemini, lawApi }) {
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  const geminiPlanOk = Boolean(lawSearchPlan.queries?.length && !lawSearchPlan.usedFallback && !lawSearchPlan.error);
  const geminiSummaryOk = Boolean(gemini.text);

  return {
    geminiConfigured,
    gemini: geminiConfigured && (geminiPlanOk || geminiSummaryOk),
    geminiPlan: geminiPlanOk,
    geminiSummary: geminiSummaryOk,
    lawApi: lawApi.enabled,
  };
}

function mergeQueries(primary, fallback) {
  return canonicalizeSearchQueries([...(primary || []), ...(fallback || [])]).slice(0, 8);
}

export async function GET() {
  return Response.json({
    ok: true,
    integrations: {
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      lawApiConfigured: Boolean(process.env.LAW_API_KEY),
    },
    runtime: {
      region: process.env.VERCEL_REGION || "local",
      preferredRegion,
    },
  });
}
