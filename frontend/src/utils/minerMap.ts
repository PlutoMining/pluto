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
