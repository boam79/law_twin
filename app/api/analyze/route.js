import { analyzeScenario, hydrateAnalysisWithLiveLaws } from "../../../lib/analyzer";
import { planLawSearchWithGemini, summarizeWithGemini } from "../../../lib/gemini";
import { fetchLawSearchBatch } from "../../../lib/lawApi";
import { buildDataQuality, buildNextSteps } from "../../../lib/analysisMeta.js";
import { canonicalizeSearchQueries } from "../../../lib/lawSearchTerms";
import {
  readAnalyzeRequestBody,
  sanitizeClientErrorMessage,
  sanitizeIntegrationStatus,
} from "../../../lib/security.js";

export const runtime = "nodejs";
export const preferredRegion = "icn1";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { scenario, sector, region, mode } = await readAnalyzeRequestBody(request);
    const analysis = analyzeScenario({ scenario, sector, region, mode });

    const lawSearchPlan = await planLawSearchWithGemini({ scenario, analysis });
    const searchQueries = mergeQueries(lawSearchPlan.queries, analysis.searchQueries);
    const lawApi = await fetchLawSearchBatch(searchQueries);
    const plannedAnalysis = { ...analysis, searchQueries };
    const hydratedAnalysis = hydrateAnalysisWithLiveLaws(plannedAnalysis, lawApi, mode);
    hydratedAnalysis.searchQueries = alignSearchQueriesWithLaws(hydratedAnalysis.searchQueries, hydratedAnalysis.laws);
    const gemini = await summarizeWithGemini({ scenario, analysis: hydratedAnalysis, lawApi });
    const payload = {
      ...hydratedAnalysis,
      lawApi,
      lawSearchPlan,
      gemini,
      integrations: buildIntegrations({ lawSearchPlan, gemini, lawApi }),
      dataQuality: buildDataQuality({ ...hydratedAnalysis, integrations: buildIntegrations({ lawSearchPlan, gemini, lawApi }) }),
      nextSteps: buildNextSteps(
        { ...hydratedAnalysis, integrations: buildIntegrations({ lawSearchPlan, gemini, lawApi }) },
        mode,
      ),
      runtime: {
        region: process.env.VERCEL_REGION || "local",
      },
    };

    return Response.json(payload);
  } catch (error) {
    const { message, status } = sanitizeClientErrorMessage(error);
    return Response.json({ error: message }, { status });
  }
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

function alignSearchQueriesWithLaws(queries, laws) {
  const titles = (laws || []).map((law) => law.title).filter(Boolean);
  return canonicalizeSearchQueries([...titles, ...(queries || [])]).slice(0, 8);
}

export async function GET() {
  return Response.json({
    ok: true,
    integrations: sanitizeIntegrationStatus(),
    runtime: {
      region: process.env.VERCEL_REGION || "local",
      preferredRegion,
    },
  });
}
