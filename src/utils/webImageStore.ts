/**
 * Web-only durable image storage, backed by IndexedDB rather than
 * localStorage (what AsyncStorage sits on for web). A single photographed
 * chart easily runs a few MB as base64, and localStorage's per-origin quota
 * is typically only 5-10MB total across every key — embedding images
 * straight into the library's JSON blob blows through that almost
 * immediately. IndexedDB's quota is a large fraction of free disk space, so
 * images are stored there instead, with just a small `wba-idb://<id>`
 * reference saved in the song's `sourceImage.uri` in its place.
 *
 * Records are stored as `{ buffer: ArrayBuffer, type: string }` rather than
 * a raw Blob — some browsers (notably older/some current Safari versions)
 * have had bugs storing and/or reading back Blob values directly via
 * structured clone in IndexedDB, silently corrupting or losing the record.
 * ArrayBuffers don't hit that path, so the Blob is reconstructed from the
 * buffer on read instead.
 *
 * Lives in utils (not the library feature) so both the library, which
 * writes these references, and song-form, which resolves them back to a
 * displayable URL for rendering, can depend on it without a cycle.
 */

interface StoredImage {
  buffer: ArrayBuffer;
  type: string;
}

const DB_NAME = "wba-images";
const STORE_NAME = "images";
const URI_PREFIX = "wba-idb://";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function uriToStoredImage(uri: string): Promise<StoredImage> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();
  return { buffer, type: blob.type || "image/jpeg" };
}

export function isWebImageRef(uri: string): boolean {
  return uri.startsWith(URI_PREFIX);
}

/** Stores the image a data:/blob: URI points to in IndexedDB under `id`, returning a lightweight `wba-idb://` reference to save in the song instead of the original URI. */
export async function storeImageForWeb(id: string, uri: string): Promise<string> {
  const stored = await uriToStoredImage(uri);
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(stored, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
  return `${URI_PREFIX}${id}`;
}

/**
 * Resolves a `wba-idb://` reference back into a displayable `blob:` object
 * URL. Any other URI passes through unchanged. Caller owns the returned
 * object URL and should revoke it when done. Returns `null` only for a
 * `wba-idb://` reference whose record can't be found/read — the caller
 * should treat that as "no image available", not retry with the raw
 * reference (it isn't renderable on its own).
 */
export async function resolveWebImageUri(uri: string): Promise<string | null> {
  if (!isWebImageRef(uri)) return uri;
  const id = uri.slice(URI_PREFIX.length);
  try {
    const db = await openDb();
    let stored: StoredImage | undefined;
    try {
      stored = await new Promise<StoredImage | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } finally {
      db.close();
    }
    if (!stored) return null;
    return URL.createObjectURL(new Blob([stored.buffer], { type: stored.type }));
  } catch {
    return null;
  }
}

/** Frees a stored image's IndexedDB entry, e.g. when its song is deleted from the library. */
export async function deleteWebImage(id: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
