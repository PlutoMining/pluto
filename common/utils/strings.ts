export function sanitizeHostname(hostname: string) {
  // Sostituisci i caratteri non ammessi nei nomi di file o nel template con un trattino "-"
  // Consentiamo solo lettere, numeri, trattini e underscore
  return hostname.replace(/[^a-zA-Z0-9_]/g, "__");
}
