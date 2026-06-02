import { GameSession, HistoricalSession } from "../types";

const DB_NAME = "JudolSimulatorDB";
const DB_VERSION = 1;

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Gagal membuka database IndexedDB"));
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Store current sessions
      if (!db.objectStoreNames.contains("sessions")) {
        db.createObjectStore("sessions", { keyPath: "id" });
      }

      // Store historical runs
      if (!db.objectStoreNames.contains("historical")) {
        db.createObjectStore("historical", { keyPath: "id" });
      }
    };
  });
}

export async function saveSession(session: GameSession): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("sessions", "readwrite");
    const store = transaction.objectStore("sessions");
    const request = store.put(session);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("Gagal menyimpan data game saat ini ke IndexedDB"));
  });
}

export async function getSession(id: string = "active"): Promise<GameSession | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("sessions", "readonly");
    const store = transaction.objectStore("sessions");
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = () => reject(new Error("Gagal memuat sesi game"));
  });
}

export async function deleteSession(id: string = "active"): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("sessions", "readwrite");
    const store = transaction.objectStore("sessions");
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("Gagal menghapus sesi game"));
  });
}

export async function saveHistoricalSession(history: HistoricalSession): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("historical", "readwrite");
    const store = transaction.objectStore("historical");
    const request = store.add(history);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("Gagal menyimpan riwayat penutupan game"));
  });
}

export async function getHistoricalSessions(): Promise<HistoricalSession[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("historical", "readonly");
    const store = transaction.objectStore("historical");
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort by timestamp desc to show fresh tragedies first
      const list = request.result as HistoricalSession[];
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      resolve(list);
    };
    request.onerror = () => reject(new Error("Gagal memuat riwayat penutupan game"));
  });
}

export async function clearAllDB(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["sessions", "historical"], "readwrite");
    transaction.objectStore("sessions").clear();
    transaction.objectStore("historical").clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error("Gagal membersihkan database"));
  });
}
