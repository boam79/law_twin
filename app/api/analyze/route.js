import { analyzeScenario, hydrateAnalysisWithLiveLaws } from "../../../lib/analyzer";
import { summarizeWithGemini } from "../../../lib/gemini";
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

    const lawSearchPlan = buildInternalLawSearchPlan(analysis);
    const searchQueries = analysis.searchQueries;
    const lawApi = await fetchLawSearchBatch(searchQueries);
    const plannedAnalysis = { ...analysis, searchQueries };
    const hydratedAnalysis = hydrateAnalysisWithLiveLaws(plannedAnalysis, lawApi, mode);
    hydratedAnalysis.searchQueries = alignSearchQueriesWithLaws(hydratedAnalysis.searchQueries, hydratedAnalysis.laws);
    const gemini = await summarizeWithGemini({ scenario, analysis: hydratedAnalysis, lawApi });
    const integrations = buildIntegrations({ lawSearchPlan, gemini, lawApi });
    const payload = {
      ...hydratedAnalysis,
      lawApi,
      lawSearchPlan,
      gemini,
      integrations,
      warnings: buildWarnings(gemini),
      dataQuality: buildDataQuality({ ...hydratedAnalysis, integrations }),
      nextSteps: buildNextSteps({ ...hydratedAnalysis, integrations }, mode),
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

function alignSearchQueriesWithLaws(queries, laws) {
  const titles = (laws || []).map((law) => law.title).filter(Boolean);
  return canonicalizeSearchQueries([...titles, ...(queries || [])]).slice(0, 8);
}

function buildInternalLawSearchPlan(analysis) {
  return {
    enabled: true,
    configured: Boolean(process.env.GEMINI_API_KEY),
    queries: [],
    rationale: ["Gemini 분당 한도 절약을 위해 내부 분석 검색어를 사용합니다."],
    error: null,
    usedFallback: true,
    skipped: true,
  };
}

function buildWarnings(gemini) {
  const warnings = [];
  if (gemini?.status === 429 || gemini?.retryable) {
    const tried = gemini?.modelsTried?.map((id) => id.replace("gemini-", "")).join(", ") || "flash 계열";
    warnings.push({
      code: "gemini_rate_limit",
      message: `무료 Gemini 모델(${tried}) 한도에 모두 걸렸습니다. 1~2분 기다린 뒤 다시 「분석 실행」을 눌러 주세요.`,
      retryAfterSec: 75,
    });
  }
  return warnings;
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
