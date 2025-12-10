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

/**
 * Validates a Stratum V2 URL format
 * Format: stratum2+tcp://host:port/authority_key
 */
export const validateStratumV2URL = (url: string): boolean => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Check for V2 URL prefix
  if (!url.startsWith('stratum2+tcp://') && !url.startsWith('stratum2+ssl://')) {
    return false;
  }

  // Validate format: stratum2+tcp://host:port/authority_key
  const v2Regex = /^stratum2\+tcp:\/\/([^:]+):(\d+)\/(.+)$/;
  const v2SslRegex = /^stratum2\+ssl:\/\/([^:]+):(\d+)\/(.+)$/;
  
  const match = url.match(v2Regex) || url.match(v2SslRegex);
  if (!match) {
    return false;
  }

  // Validate port
  const port = parseInt(match[2], 10);
  if (isNaN(port) || port < 0 || port > 65535) {
    return false;
  }

  // Validate host (domain or IP)
  const host = match[1];
  if (!validateDomain(host, { allowIP: true })) {
    return false;
  }

  // Validate authority key (base58-check)
  const authorityKey = match[3];
  if (!validateBase58Check(authorityKey)) {
    return false;
  }

  return true;
};

/**
 * Validates a base58-check encoded string
 * Base58 uses: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
 * (excludes 0, O, I, l to avoid confusion)
 */
export const validateBase58Check = (value: string): boolean => {
  if (!value || typeof value !== 'string') {
    return false;
  }

  // Base58 alphabet (no 0, O, I, l)
  const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
  
  // Check if string contains only base58 characters
  if (!base58Regex.test(value)) {
    return false;
  }

  // Authority keys are typically 50-60 characters (base58-check encoded public keys)
  // Allow a reasonable range
  if (value.length < 20 || value.length > 100) {
    return false;
  }

  return true;
};
