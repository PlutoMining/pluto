/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { Level } from "level";

// Mappa per mantenere traccia delle istanze singleton dei database
const dbInstances: Map<string, Level<string, any>> = new Map();

// Variabile per tenere traccia se l'handler è stato già registrato
let exitHandlerRegistered = false;

interface BaseEntity {
  createdAt?: string; // Oppure Date, a seconda di come rappresenti il timestamp
  updatedAt?: string; // Oppure Date
}

// Funzione per ottenere l'istanza singleton di un database in base al nome
async function getDatabase(dbName: string): Promise<Level<string, any>> {
  if (!dbName) {
    throw new Error("Database name must be provided.");
  }

  // Controlla se esiste già un'istanza per questo nome
  if (!dbInstances.has(dbName)) {
    const db = new Level<string, any>(`./data/${dbName}`, { valueEncoding: "json" });
    await db.open();
    dbInstances.set(dbName, db);

    // Registra l'handler per chiudere il database quando il processo termina, se non è già stato registrato
    if (!exitHandlerRegistered) {
      process.on("exit", async () => {
        await closeAllDatabases();
      });
      exitHandlerRegistered = true; // Evita di registrare più handler
    }
  }

  // Ritorna l'istanza singleton per questo nome di database
  return dbInstances.get(dbName) as Level<string, any>;
}

// Funzione per chiudere tutti i database al termine del processo
export async function closeAllDatabases(): Promise<void> {
  const dbNames = Array.from(dbInstances.keys());
  for (const dbName of dbNames) {
    await closeDatabase(dbName);
  }
}

// Funzione per chiudere un singolo database
export async function closeDatabase(dbName: string): Promise<void> {
  const db = dbInstances.get(dbName);
  if (!db) {
    return;
  }

  await db.close();
  dbInstances.delete(dbName);
  // console.log(`Database ${dbName} closed.`);
}

// Funzione per ottenere un record specifico con prefisso
export async function findOne<T extends BaseEntity>(
  dbName: string,
  prefix: string,
  key: string
): Promise<T | null> {
  const db = await getDatabase(dbName);

  if (!prefix || !key) {
    throw new Error("Prefix and key must be provided.");
  }

  const fullKey = buildKeyWithPrefix(prefix, key);
  try {
    const record = await db.get(fullKey);
    return record;
  } catch (error) {
    if (error instanceof Error && (error as any).code === "LEVEL_NOT_FOUND") {
      return null; // Restituisce null se il record non esiste
    } else if (error instanceof Error) {
      console.error(`Error reading from DB with key ${fullKey}:`, error.message);
      throw error;
    } else {
      console.error(`Unknown error occurred while reading from DB with key ${fullKey}.`);
      throw error;
    }
  }
}

// Funzione per ottenere una lista di oggetti da una lista di chiavi con prefisso, con filtri opzionali
export async function findMany<T extends BaseEntity>(
  dbName: string,
  fullListKey: string, // Chiave completa della lista (es. 'devices:discovered')
  filters?: (record: T) => boolean // Funzione di filtro opzionale
): Promise<T[]> {
  const db = await getDatabase(dbName);

  try {
    // Recupera la lista delle chiavi (id)
    const keyList: string[] = await db.get(fullListKey);
    const objects: T[] = [];

    // Itera su ogni chiave e recupera il corrispondente oggetto
    for (const key of keyList) {
      try {
        const fullKey = buildKeyWithPrefix(fullListKey, key); // Usa il prefisso per creare la chiave completa
        const obj: T = await db.get(fullKey); // Recupera il record associato alla chiave completa

        // Se c'è un filtro applicalo, altrimenti accetta tutti gli oggetti
        if (!filters || filters(obj)) {
          objects.push(obj);
        }
      } catch (error) {
        if (error instanceof Error && (error as any).code === "LEVEL_NOT_FOUND") {
          console.warn(`Key not found: ${key}`);
        } else if (error instanceof Error) {
          console.error(`Error reading from DB with key ${key}:`, error.message);
        }
      }
    }

    // Ordina le liste per createdAt (stringa ISO) in ordine decrescente
    const sortedObjects = objects.sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );

    return sortedObjects;
  } catch (error) {
    if (error instanceof Error && (error as any).code === "LEVEL_NOT_FOUND") {
      return []; // Restituisce un array vuoto se la lista di chiavi non esiste
    } else if (error instanceof Error) {
      console.error(`Error reading from DB with key ${fullListKey}:`, error.message);
    } else {
      console.error(`Unknown error occurred while reading from DB with key ${fullListKey}.`);
    }
    throw error;
  }
}

export async function insertOne<T extends BaseEntity>(
  dbName: string,
  fullListKey: string, // Chiave completa della lista (es. 'devices:discovered')
  objectKey: string, // Chiave univoca dell'oggetto (es. MAC address)
  objectValue: T // Valore dell'oggetto (es. DeviceInfo)
): Promise<T> {
  const db = await getDatabase(dbName);
  let keyList: string[] = [];

  // Verifica se esiste già un record con questa chiave
  const existingRecord = await findOne<T>(dbName, fullListKey, objectKey);
  if (existingRecord) {
    throw new Error(`Record with key ${objectKey} already exists.`);
  }

  try {
    // Recupera la lista delle chiavi esistenti
    keyList = await db.get(fullListKey);
  } catch (error) {
    if ((error as any).code === "LEVEL_NOT_FOUND") {
      // Inizializza la lista se non esiste
      keyList = [];
    } else {
      throw error;
    }
  }

  // Aggiungi la chiave se non esiste già
  if (!keyList.includes(objectKey)) {
    keyList.push(objectKey);
  }

  const objectFullKey = buildKeyWithPrefix(fullListKey, objectKey);

  // Aggiungi i campi createdAt e updatedAt
  const timestamp = new Date().toISOString();
  const newObject = {
    ...objectValue,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  try {
    // Salva l'oggetto con la chiave completa e aggiorna la lista delle chiavi
    await db.put(objectFullKey, newObject); // Salva l'oggetto
    await db.put(fullListKey, keyList); // Salva la lista aggiornata delle chiavi

    // console.log(`Object with key ${objectFullKey} inserted into ${fullListKey}.`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error writing to DB with key ${objectKey}:`, error.message);
    }
    throw error;
  }

  return newObject;
}

// Funzione per aggiornare una lista di oggetti con prefisso (semplificata)
export async function updateOne<T extends BaseEntity>(
  dbName: string,
  fullListKey: string, // Chiave completa della lista (es. 'devices:discovered')
  objectKey: string, // Chiave univoca dell'oggetto (es. MAC address)
  objectValue: Partial<T> // Valore dell'oggetto (es. DeviceInfo)
): Promise<T> {
  const db = await getDatabase(dbName);
  let keyList: string[] = [];

  try {
    // Recupera la lista delle chiavi esistenti
    keyList = await db.get(fullListKey);
  } catch (error) {
    if ((error as any).code === "LEVEL_NOT_FOUND") {
      // Inizializza la lista se non esiste
      keyList = [];
    } else {
      throw error;
    }
  }

  // Aggiungi la chiave se non esiste già
  if (!keyList.includes(objectKey)) {
    keyList.push(objectKey);
  }

  const objectFullKey = buildKeyWithPrefix(fullListKey, objectKey);

  // Recupera il record esistente per fare lo shallow merge
  let existingRecord: T | null = null;
  try {
    existingRecord = await findOne<T>(dbName, fullListKey, objectKey);
  } catch (error) {
    if ((error as any).code !== "LEVEL_NOT_FOUND") {
      throw error;
    }
  }

  // Unisci il record esistente con il nuovo oggetto (shallow merge)
  const mergedObject = {
    ...existingRecord, // Record esistente (se presente, se non presente viene scatenata eccezione prima)
    ...objectValue, // Nuovo oggetto che viene passato
    updatedAt: new Date().toISOString(),
    createdAt: existingRecord ? (existingRecord as any).createdAt : new Date().toISOString(),
  } as T;

  try {
    // Salva l'oggetto con la chiave completa e aggiorna la lista delle chiavi
    await db.put(objectFullKey, mergedObject); // Salva l'oggetto
    await db.put(fullListKey, keyList); // Salva la lista aggiornata delle chiavi

    // console.log(`Object with key ${objectFullKey} updated in ${fullListKey}.`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error writing to DB with key ${objectKey}:`, error.message);
    }
    throw error;
  }

  return mergedObject;
}

// Funzione per cancellare un record specifico con prefisso e aggiornare la lista delle chiavi
export async function deleteOne<T extends BaseEntity>(
  dbName: string,
  fullListKey: string, // Chiave della lista
  objectKey: string
): Promise<T | null> {
  const db = await getDatabase(dbName);

  if (!fullListKey || !objectKey) {
    throw new Error("List key and object key must be provided.");
  }

  const fullKey = buildKeyWithPrefix(fullListKey, objectKey);

  try {
    // Recupera il record prima di cancellarlo
    const record: T = await db.get(fullKey);

    // Cancella il record
    await db.del(fullKey);
    // console.log(`Record with key ${fullKey} deleted.`);

    // Aggiorna la lista delle chiavi
    let keyList: string[] = [];
    try {
      keyList = await db.get(fullListKey);
    } catch (error) {
      if ((error as any).code === "LEVEL_NOT_FOUND") {
        console.warn(`List with key ${fullListKey} not found.`);
        return record; // Se la lista non esiste, restituisce comunque il record cancellato
      } else {
        throw error;
      }
    }

    // Rimuovi la chiave dalla lista
    const updatedKeyList = keyList.filter((existingKey) => existingKey !== objectKey);

    // Aggiorna la lista nel database
    await db.put(fullListKey, updatedKeyList);
    console.log(`Key ${objectKey} removed from list ${fullListKey}.`);

    // Restituisce il valore cancellato
    return record;
  } catch (error) {
    if ((error as any).code === "LEVEL_NOT_FOUND") {
      console.warn(`Record with key ${fullKey} not found.`);
      return null; // Se il record non esiste, restituisce null
    }
    console.error(`Error deleting record with key ${fullKey}:`, error);
    throw error;
  }
}

// Utility per costruire una chiave con prefisso
function buildKeyWithPrefix(prefix: string, key: string): string {
  return `${prefix}:${key}`;
}

// Funzione per inserire più documenti (stub)
export async function insertMany<T extends BaseEntity>(
  dbName: string,
  objects: T[]
): Promise<void> {
  throw new Error("Method insertMany is not implemented.");
}

// Funzione per aggiornare più documenti (stub)
export async function updateMany<T extends BaseEntity>(
  dbName: string,
  filter: Partial<T>,
  update: Partial<T>
): Promise<void> {
  throw new Error("Method updateMany is not implemented.");
}

// Funzione per cancellare più documenti (stub)
export async function deleteMany<T extends BaseEntity>(
  dbName: string,
  filter: Partial<T>
): Promise<void> {
  throw new Error("Method deleteMany is not implemented.");
}

// Funzione per contare i documenti (stub)
export async function countDocuments<T extends BaseEntity>(
  dbName: string,
  filter: Partial<T>
): Promise<number> {
  throw new Error("Method countDocuments is not implemented.");
}

// Funzione per ottenere valori distinti (stub)
export async function distinct<T extends BaseEntity>(dbName: string, field: keyof T): Promise<T[]> {
  throw new Error("Method distinct is not implemented.");
}
