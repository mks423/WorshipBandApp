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
 * Lives in utils (not the library feature) so both the library, which
 * writes these references, and song-form, which resolves them back to a
 * displayable URL for rendering, can depend on it without a cycle.
 */

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

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return response.blob();
}

export function isWebImageRef(uri: string): boolean {
  return uri.startsWith(URI_PREFIX);
}

/** Stores the image a data:/blob: URI points to in IndexedDB under `id`, returning a lightweight `wba-idb://` reference to save in the song instead of the original URI. */
export async function storeImageForWeb(id: string, uri: string): Promise<string> {
  const blob = await uriToBlob(uri);
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
  return `${URI_PREFIX}${id}`;
}

/** Resolves a `wba-idb://` reference back into a displayable `blob:` object URL. Any other URI passes through unchanged. Caller owns the returned object URL and should revoke it when done. */
export async function resolveWebImageUri(uri: string): Promise<string> {
  if (!isWebImageRef(uri)) return uri;
  const id = uri.slice(URI_PREFIX.length);
  const db = await openDb();
  let blob: Blob | undefined;
  try {
    blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
  return blob ? URL.createObjectURL(blob) : uri;
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
