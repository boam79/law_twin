const MAX_BODY_BYTES = 32_768;
const MAX_SCENARIO_LENGTH = 4_000;
const MAX_PROMPT_SCENARIO_LENGTH = 3_500;

const ALLOWED_SECTORS = new Set([
  "auto",
  "general",
  "workplace",
  "enterprise",
  "public",
  "privacy",
  "realestate",
  "tax",
  "food",
  "construction",
  "environment",
  "traffic",
  "education",
  "healthcare",
  "fire",
]);

const ALLOWED_REGIONS = new Set(["auto", "seoul", "gyeonggi", "busan", "nationwide"]);
const ALLOWED_MODES = new Set(["impact", "conflict", "checklist"]);
const GEMINI_MODEL_PATTERN = /^gemini-[a-z0-9][a-z0-9._-]{0,62}$/i;

const DEFAULT_GEMINI_FALLBACK_ORDER = ["gemini-2.5-pro"];
const DEFAULT_GEMINI_PLANNER_FALLBACK_ORDER = ["gemini-2.5-flash", "gemini-2.5-pro"];
const GEMINI_SUMMARY_MODES = new Set(["off", "lite", "full"]);
const GEMINI_20_MODEL_PATTERN = /gemini-2\.0/i;
const LAW_GO_KR_HOST = "www.law.go.kr";

export class RequestValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "RequestValidationError";
    this.status = status;
  }
}

export function getMaxBodyBytes() {
  return MAX_BODY_BYTES;
}

export async function readAnalyzeRequestBody(request) {
  const contentLength = Number.parseInt(request.headers.get("content-length") || "0", 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw new RequestValidationError("요청 본문이 너무 큽니다.", 413);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    throw new RequestValidationError("요청 본문이 너무 큽니다.", 413);
  }

  if (!raw.trim()) {
    throw new RequestValidationError("JSON 본문이 필요합니다.", 400);
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new RequestValidationError("잘못된 JSON 형식입니다.", 400);
  }

  return validateAnalyzeBody(body);
}

export function validateAnalyzeBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new RequestValidationError("요청 형식이 올바르지 않습니다.", 400);
  }

  return {
    scenario: sanitizeScenario(body.scenario),
    sector: pickEnum(body.sector, ALLOWED_SECTORS, "auto"),
    region: pickEnum(body.region, ALLOWED_REGIONS, "auto"),
    mode: pickEnum(body.mode, ALLOWED_MODES, "impact"),
  };
}

export function sanitizeScenario(value) {
  const text = String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    throw new RequestValidationError("상황 설명을 입력해 주세요.", 400);
  }

  if (text.length > MAX_SCENARIO_LENGTH) {
    throw new RequestValidationError(`상황 설명은 ${MAX_SCENARIO_LENGTH}자 이하로 입력해 주세요.`, 400);
  }

  return text;
}

export function wrapScenarioForPrompt(scenario) {
  const safe = sanitizeScenario(scenario).slice(0, MAX_PROMPT_SCENARIO_LENGTH);
  return `<<<USER_SCENARIO>>>\n${safe}\n<<<END_USER_SCENARIO>>>`;
}

export function getGeminiModel() {
  const model = String(process.env.GEMINI_MODEL || "gemini-2.5-flash-lite").trim();
  if (!GEMINI_MODEL_PATTERN.test(model)) {
    return "gemini-2.5-flash-lite";
  }
  return model;
}

export function getGeminiPlannerMode() {
  const mode = String(process.env.GEMINI_PLANNER_MODE || "off").trim().toLowerCase();
  return mode === "on" ? "on" : "off";
}

export function getGeminiPlannerModel() {
  const model = String(process.env.GEMINI_PLANNER_MODEL || "gemini-2.5-flash-lite").trim();
  if (!GEMINI_MODEL_PATTERN.test(model) || GEMINI_20_MODEL_PATTERN.test(model)) {
    return "gemini-2.5-flash-lite";
  }
  return model;
}

export function getGeminiPlannerModelChain() {
  const primary = getGeminiPlannerModel();
  const configured = String(process.env.GEMINI_PLANNER_MODEL_FALLBACK || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => GEMINI_MODEL_PATTERN.test(item) && !GEMINI_20_MODEL_PATTERN.test(item));
  const tail = configured.length ? configured : DEFAULT_GEMINI_PLANNER_FALLBACK_ORDER;
  const chain = [];

  for (const model of [primary, ...tail]) {
    if (!chain.includes(model)) chain.push(model);
  }

  return chain;
}

export function getGeminiSummaryMode() {
  const skip = String(process.env.SKIP_GEMINI_SUMMARY || "").trim().toLowerCase();
  if (skip === "1" || skip === "true" || skip === "yes") return "off";

  const configured = String(process.env.GEMINI_SUMMARY_MODE || "").trim().toLowerCase();
  if (configured && GEMINI_SUMMARY_MODES.has(configured)) {
    return configured;
  }

  if (getGeminiPlannerMode() === "on") return "off";

  return "lite";
}

export function getGeminiSummaryMaxTokens(mode = getGeminiSummaryMode()) {
  if (mode === "off") return 0;

  const configured = Number.parseInt(process.env.GEMINI_SUMMARY_MAX_TOKENS || "", 10);
  if (Number.isFinite(configured) && configured > 0) {
    return Math.min(configured, 2048);
  }

  if (mode === "full") return 700;
  return 400;
}

export function getGeminiSummaryTemperature(mode = getGeminiSummaryMode()) {
  return mode === "full" ? 0.2 : 0.15;
}

export function getGeminiModelChain() {
  const primary = getGeminiModel();
  const configured = String(process.env.GEMINI_MODEL_FALLBACK || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => GEMINI_MODEL_PATTERN.test(item));
  const tail = configured.length ? configured : DEFAULT_GEMINI_FALLBACK_ORDER;
  const chain = [];

  for (const model of [primary, ...tail]) {
    if (!chain.includes(model)) chain.push(model);
  }

  return chain;
}

export function sanitizeLawDetailPath(path) {
  if (!path) return "";

  try {
    const url = new URL(String(path), `https://${LAW_GO_KR_HOST}`);
    if (url.protocol !== "https:") return "";
    if (url.hostname !== LAW_GO_KR_HOST) return "";
    if (!url.pathname.startsWith("/")) return "";
    if (/[<>"'`\\]/.test(`${url.pathname}${url.search}`)) return "";

    url.searchParams.delete("OC");
    url.searchParams.delete("oc");

    const search = url.searchParams.toString();
    return search ? `${url.pathname}?${search}` : url.pathname;
  } catch {
    return "";
  }
}

export function buildSafeLawGoKrUrl(detailPath) {
  const safePath = sanitizeLawDetailPath(detailPath);
  if (!safePath) return null;
  return `https://${LAW_GO_KR_HOST}${safePath}`;
}

export function sanitizeClientErrorMessage(error) {
  if (error instanceof RequestValidationError) {
    return { message: error.message, status: error.status };
  }
  return { message: "분석 요청을 처리하지 못했습니다.", status: 500 };
}

export function getGeminiApiKeys() {
  const merged = [];
  for (const key of [...parseGeminiApiKeyList(process.env.GEMINI_API_KEY), ...parseGeminiApiKeyList(process.env.GEMINI_API_KEYS)]) {
    if (key && !merged.includes(key)) merged.push(key);
  }
  return merged;
}

export function isGeminiConfigured() {
  return getGeminiApiKeys().length > 0;
}

function parseGeminiApiKeyList(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function sanitizeIntegrationStatus() {
  const summaryMode = getGeminiSummaryMode();
  const plannerMode = getGeminiPlannerMode();
  return {
    lawApi: Boolean(process.env.LAW_API_KEY),
    geminiConfigured: isGeminiConfigured(),
    geminiApiKeyCount: getGeminiApiKeys().length,
    geminiPlannerMode: plannerMode,
    geminiPlannerEnabled: plannerMode === "on",
    geminiSummaryMode: summaryMode,
    geminiSummaryEnabled: summaryMode !== "off",
  };
}

export function redactSecrets(text) {
  let output = String(text || "")
    .replace(/key=[^&\s]+/gi, "key=[REDACTED]")
    .replace(/OC=[^&\s]+/gi, "OC=[REDACTED]");

  for (const apiKey of getGeminiApiKeys()) {
    if (apiKey.length >= 8) {
      output = output.split(apiKey).join("[REDACTED]");
    }
  }

  return output;
}

function pickEnum(value, allowed, fallback) {
  const key = String(value ?? "").trim();
  return allowed.has(key) ? key : fallback;
}
