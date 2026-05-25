import { analyzeScenario } from "../../../lib/analyzer";
import { summarizeWithGemini } from "../../../lib/gemini";
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

  const lawApi = await fetchLawSearchBatch(analysis.searchQueries);
  const gemini = await summarizeWithGemini({ scenario, analysis, lawApi });

  return Response.json({
    ...analysis,
    lawApi,
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
