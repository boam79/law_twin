export function getLawApiMaxQueries() {
  const configured = Number.parseInt(process.env.LAW_API_MAX_QUERIES || "8", 10);
  if (!Number.isFinite(configured) || configured < 1) return 8;
  return Math.min(configured, 16);
}
