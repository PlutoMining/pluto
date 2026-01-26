// Ensure required env vars exist for module-level config imports.
if (typeof process.env.MOCK_DISCOVERY_HOST !== "string" || process.env.MOCK_DISCOVERY_HOST.trim() === "") {
  process.env.MOCK_DISCOVERY_HOST = "http://mock";
}
