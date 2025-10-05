/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

const boards: Map<string, string> = new Map();

boards.set("401", "Bitaxe Supra (401)");

export function getMinerName(boardVersion: string): string {
  // Controlla se la board version esiste nella mappa
  if (boards.has(boardVersion)) {
    // Ritorna il nome completo del miner se esiste nella mappa
    return boards.get(boardVersion)!;
  }

  // Fallback: se non esiste, ritorna la board version
  return boardVersion;
}
