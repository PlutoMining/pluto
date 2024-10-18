export function formatTime(seconds: number) {
  const oneDayInSeconds = 86400;
  const oneHourInSeconds = 3600;
  const oneMinuteInSeconds = 60;

  if (seconds === 0) {
    return "-";
  } else if (seconds >= oneDayInSeconds) {
    const days = Math.floor(seconds / oneDayInSeconds);
    return `${days} ${days > 1 ? "days" : "day"}`;
  } else if (seconds >= oneHourInSeconds) {
    const hours = Math.floor(seconds / oneHourInSeconds);
    return `${hours} ${hours > 1 ? "hours" : "hour"}`;
  } else if (seconds >= oneMinuteInSeconds) {
    const minutes = Math.floor(seconds / oneMinuteInSeconds);
    return `${minutes} ${minutes > 1 ? "minutes" : "minute"}`;
  } else {
    return "< 1 minute"; // Se il tempo è inferiore a un minuto, mostra "meno di 1 minuto"
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
