export function logAnalyzeEvent(event) {
  if (process.env.ANALYZE_STRUCTURED_LOG === "0") return;
  try {
    console.log(
      JSON.stringify({
        type: "lawtwin.analyze",
        ts: new Date().toISOString(),
        ...event,
      }),
    );
  } catch {
    // ignore logging failures
  }
}
