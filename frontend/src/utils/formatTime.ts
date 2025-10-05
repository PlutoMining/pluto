/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

export function formatTime(seconds: number) {
  const oneDayInSeconds = 86400;
  const oneHourInSeconds = 3600;
  const oneMinuteInSeconds = 60;

  if (seconds === 0) {
    return "-";
  } else if (seconds >= oneDayInSeconds) {
    const days = Math.floor(seconds / oneDayInSeconds);
    return `${days} d`;
  } else if (seconds >= oneHourInSeconds) {
    const hours = Math.floor(seconds / oneHourInSeconds);
    return `${hours} h`;
  } else if (seconds >= oneMinuteInSeconds) {
    const minutes = Math.floor(seconds / oneMinuteInSeconds);
    return `${minutes} m`;
  } else {
    return "< 1 m"; // Se il tempo è inferiore a un minuto, mostra "meno di 1 minuto"
  }
}

export function convertIsoTomMdDYy(isoDate: string): string {
  // Creare un oggetto Date dalla stringa ISO
  const date = new Date(isoDate);

  // Ottenere il giorno, il mese e l'anno
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // I mesi partono da 0
  const year = String(date.getFullYear()).slice(-2); // Ultimi due cifre dell'anno

  // Restituire la data formattata
  return `${month}/${day}/${year}`;
}

export function formatDetailedTime(seconds: number): string {
  const timeUnits = {
    y: Math.floor(seconds / (60 * 60 * 24 * 365)),
    w: Math.floor((seconds % (60 * 60 * 24 * 365)) / (60 * 60 * 24 * 7)),
    d: Math.floor((seconds % (60 * 60 * 24 * 7)) / (60 * 60 * 24)),
    h: Math.floor((seconds % (60 * 60 * 24)) / (60 * 60)),
    m: Math.floor((seconds % (60 * 60)) / 60),
  };

  const parts: string[] = [];

  if (timeUnits.y > 0) {
    parts.push(`${timeUnits.y}y`);
    if (timeUnits.w > 0) parts.push(`${timeUnits.w}w`);
    if (timeUnits.d > 0) parts.push(`${timeUnits.d}d`);
  } else if (timeUnits.w > 0) {
    parts.push(`${timeUnits.w}w`);
    if (timeUnits.d > 0) parts.push(`${timeUnits.d}d`);
    if (timeUnits.h > 0) parts.push(`${timeUnits.h}h`);
  } else if (timeUnits.d > 0) {
    parts.push(`${timeUnits.d}d`);
    if (timeUnits.h > 0) parts.push(`${timeUnits.h}h`);
    if (timeUnits.m > 0) parts.push(`${timeUnits.m}m`);
  } else if (timeUnits.h > 0) {
    parts.push(`${timeUnits.h}h`);
    if (timeUnits.m > 0) parts.push(`${timeUnits.m}m`);
  } else {
    parts.push(`${timeUnits.m}m`);
  }

  return parts.slice(0, 3).join(" ");
}
