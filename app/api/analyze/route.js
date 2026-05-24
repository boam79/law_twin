import { analyzeScenario } from "../../../lib/analyzer";
import { summarizeWithGemini } from "../../../lib/gemini";
import { fetchLawSearchResults } from "../../../lib/lawApi";

export async function POST(request) {
  const body = await request.json();
  const scenario = String(body.scenario || "");
  const analysis = analyzeScenario({
    scenario,
    sector: body.sector || "auto",
    region: body.region || "auto",
    mode: body.mode || "impact",
  });

  const lawQuery = analysis.laws[0]?.title || "근로기준법";
  const lawApi = await fetchLawSearchResults(lawQuery);
  const gemini = await summarizeWithGemini({ scenario, analysis, lawApi });

  return Response.json({
    ...analysis,
    lawApi,
    gemini,
    integrations: {
      gemini: gemini.enabled,
      lawApi: lawApi.enabled,
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
  });
}
