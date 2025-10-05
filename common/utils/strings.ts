/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

export function sanitizeHostname(hostname: string) {
  // Sostituisci i caratteri non ammessi nei nomi di file o nel template con un trattino "-"
  // Consentiamo solo lettere, numeri, trattini e underscore
  return hostname.replace(/[^a-zA-Z0-9_]/g, "__");
}
