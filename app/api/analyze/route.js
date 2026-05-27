import { analyzeScenario, buildEmergencySearchQueries, hydrateAnalysisWithLiveLaws } from "../../../lib/analyzer";
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
    const emergencyQueries = buildEmergencySearchQueries(analysis.conditions, searchQueries, scenario);
    const lawApi = await fetchLawSearchBatch(searchQueries, { emergencyQueries });
    const plannedAnalysis = { ...analysis, searchQueries };
    const hydratedAnalysis = hydrateAnalysisWithLiveLaws(plannedAnalysis, lawApi, mode);
    hydratedAnalysis.searchQueries = alignSearchQueriesWithLaws(hydratedAnalysis.searchQueries, hydratedAnalysis.laws);
    const gemini = await summarizeWithGemini({ scenario, analysis: hydratedAnalysis, lawApi });
    const integrations = buildIntegrations({ lawSearchPlan, gemini, lawApi, laws: hydratedAnalysis.laws });
    const payload = {
      ...hydratedAnalysis,
      lawApi,
      lawSearchPlan,
      gemini,
      integrations,
      warnings: buildWarnings(gemini, lawApi, hydratedAnalysis.laws),
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

function buildIntegrations({ lawSearchPlan, gemini, lawApi, laws }) {
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  const geminiPlanOk = Boolean(lawSearchPlan.queries?.length && !lawSearchPlan.usedFallback && !lawSearchPlan.error);
  const geminiSummaryOk = Boolean(gemini.text);
  const lawApiKeyConfigured = Boolean(process.env.LAW_API_KEY);
  const hasLawResults = Boolean(lawApi?.items?.length) || Boolean(laws?.length);

  return {
    geminiConfigured,
    gemini: geminiConfigured && (geminiPlanOk || geminiSummaryOk),
    geminiPlan: geminiPlanOk,
    geminiSummary: geminiSummaryOk,
    lawApi: lawApiKeyConfigured && hasLawResults,
    lawApiConfigured: lawApiKeyConfigured,
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

function buildWarnings(gemini, lawApi, laws) {
  const warnings = [];
  const lawApiKeyConfigured = Boolean(process.env.LAW_API_KEY);

  if (lawApiKeyConfigured && !lawApi?.items?.length && !(laws?.length)) {
    warnings.push({
      code: "law_api_empty",
      message:
        "법제처 API는 연결됐지만 검색 결과가 없습니다. 상황을 조금 더 구체적으로 적거나 잠시 후 다시 시도해 주세요.",
    });
  } else if (lawApiKeyConfigured && lawApi?.error && !(laws?.length)) {
    warnings.push({
      code: "law_api_error",
      message: "법제처 검색 중 오류가 발생했습니다. 내부 규칙 후보만 표시될 수 있습니다.",
    });
  }

  if (gemini?.status === 429 || gemini?.retryable) {
    const label = gemini?.modelLabel || gemini?.modelsTried?.[0]?.replace("gemini-", "") || "flash-lite";
    warnings.push({
      code: "gemini_rate_limit",
      message: `Gemini 무료 한도(분당 약 5회)에 걸렸습니다(${label}). 1~2분 후 다시 시도해 주세요. 법령·체크리스트는 그대로 이용할 수 있습니다.`,
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
