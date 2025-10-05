/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

// Funzioni di validazione IP e MAC
export const isValidIp = (ip: string) => {
  const ipRegex =
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
};

export const isValidMac = (mac: string) => {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
};

export const validateBitcoinAddress = (address: string) => {
  // Regex per indirizzi P2PKH (iniziano con 1) e P2SH (iniziano con 3)
  const legacyAndSegwitRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;

  // Regex per indirizzi Bech32 (iniziano con bc1)
  const bech32Regex = /^(bc1)[a-zA-HJ-NP-Z0-9]{11,87}$/;

  // Controlla se l'indirizzo corrisponde a uno dei formati validi
  return legacyAndSegwitRegex.test(address) || bech32Regex.test(address);
};

export const validateTCPPort = (port: number) => {
  // Controlla se la porta è un numero intero e se è compresa tra 0 e 65535
  return Number.isInteger(port) && port >= 0 && port <= 65535;
};

type ValidationOptions = {
  allowUnderscore?: boolean;
  requireFQDN?: boolean;
  allowIP?: boolean;
};

export const validateDomain = (domain: string, options: ValidationOptions = {}) => {
  const { allowUnderscore = false, requireFQDN = false, allowIP = true } = options;

  // Regex base senza underscore per i domini
  let domainRegex = `(?=^.{1,253}$)(^((?!-)[a-zA-Z0-9-]{1,63}(?<!-)\\.?)+[a-zA-Z]{0,63}$)`;

  // Se allowUnderscore è true, modifica la regex per includere l'underscore
  if (allowUnderscore) {
    domainRegex = `(?=^.{1,253}$)(^((?!-)[a-zA-Z0-9-_]{1,63}(?<!-)\\.?)+[a-zA-Z]{0,63}$)`;
  }

  // Se requireFQDN è true, richiede almeno un punto
  if (requireFQDN) {
    domainRegex = `(?=^.{4,253}$)(^((?!-)[a-zA-Z0-9-]{1,63}(?<!-)\\.)+[a-zA-Z]{2,63}$)`;
    if (allowUnderscore) {
      domainRegex = `(?=^.{4,253}$)(^((?!-)[a-zA-Z0-9-_]{1,63}(?<!-)\\.)+[a-zA-Z]{2,63}$)`;
    }
  }

  // Regex per IPv4
  const ipv4Regex = `^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$`;

  // Regex per IPv6
  const ipv6Regex = `^([0-9a-fA-F]{1,4}:){7}([0-9a-fA-F]{1,4}|:)$|^(([0-9a-fA-F]{1,4}:){1,7}|:):(([0-9a-fA-F]{1,4}:){1,6}|:)|::`;

  // Combina le regex se allowIP è abilitato
  let finalRegex = domainRegex;
  if (allowIP) {
    finalRegex = `(?:${domainRegex})|(?:${ipv4Regex})|(?:${ipv6Regex})`;
  }

  // Compila la regex dinamicamente
  const finalCompiledRegex = new RegExp(finalRegex);

  // Test del dominio o dell'IP
  return finalCompiledRegex.test(domain);
};
