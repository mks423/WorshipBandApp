import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

import type { Song } from "../../types/song";
import { deleteWebImage, isWebImageRef, storeImageForWeb } from "../../utils/webImageStore";

const STORAGE_KEY = "wba.library.v1";

// Built lazily, and only ever on native: expo-file-system's Directory/Paths
// construction isn't backed by a real filesystem on web and throws there, so
// touching it at module scope would crash the app on load for every
// platform, web included.
let _sourcesDir: Directory | null = null;
function getSourcesDir(): Directory {
  if (!_sourcesDir) _sourcesDir = new Directory(Paths.document, "wba-sources");
  return _sourcesDir;
}

/** Fills in defaults for fields added to the Song model after some songs were already saved, so old library entries don't come back with `undefined` where code now expects e.g. an array or a string. */
function withDefaults(song: Song): Song {
  return {
    ...song,
    bpm: song.bpm ?? null,
    notes: song.notes ?? "",
    sectionMarkers: song.sectionMarkers ?? [],
  };
}

/** Reads the whole saved library. Never throws — a corrupt/missing entry just comes back as an empty library. */
export async function loadLibrary(): Promise<Song[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Song[]).map(withDefaults) : [];
  } catch {
    return [];
  }
}

async function saveLibrary(songs: Song[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
}

/**
 * Copies a song's source image into durable storage, if it isn't already
 * there, so the persisted library blob only ever holds a small reference to
 * it rather than the image itself.
 *
 * On native this means copying the file into the app's permanent document
 * directory: camera/file-picker URIs point at OS-managed cache locations
 * that can be cleared between launches, and a PDF-rasterized page's URI is
 * a large inline base64 data URI that would otherwise get duplicated
 * straight into the persisted blob on every save.
 *
 * On web there's no comparable filesystem, but embedding the image inline
 * is what was blowing through localStorage's ~5-10MB per-origin quota (what
 * AsyncStorage sits on for web) — a single photographed chart alone can
 * exceed that. Data/blob URIs are moved into IndexedDB instead, whose quota
 * is a large fraction of free disk space.
 */
async function ensureDurableImage(song: Song): Promise<Song> {
  if (!song.sourceImage) return song;
  const { uri } = song.sourceImage;

  if (Platform.OS === "web") {
    if (isWebImageRef(uri) || (!uri.startsWith("data:") && !uri.startsWith("blob:"))) return song;
    try {
      const idbUri = await storeImageForWeb(song.id, uri);
      return { ...song, sourceImage: { ...song.sourceImage, uri: idbUri } };
    } catch {
      // Best effort — if IndexedDB storage fails, save the song with its original URI rather than losing it entirely.
      return song;
    }
  }

  const sourcesDir = getSourcesDir();
  if (uri.startsWith(sourcesDir.uri)) return song;

  try {
    if (!sourcesDir.exists) sourcesDir.create({ intermediates: true });

    if (uri.startsWith("data:")) {
      const match = /^data:image\/(\w+);base64,(.*)$/.exec(uri);
      const ext = match?.[1] === "jpeg" ? "jpg" : (match?.[1] ?? "png");
      const base64 = match ? match[2] : uri.slice(uri.indexOf(",") + 1);
      const dest = new File(sourcesDir, `${song.id}.${ext}`);
      dest.create({ intermediates: true, overwrite: true });
      dest.write(base64, { encoding: "base64" });
      return { ...song, sourceImage: { ...song.sourceImage, uri: dest.uri } };
    }

    const source = new File(uri);
    const dest = new File(sourcesDir, `${song.id}${source.extension || ".jpg"}`);
    await source.copy(dest, { overwrite: true });
    return { ...song, sourceImage: { ...song.sourceImage, uri: dest.uri } };
  } catch {
    // Best effort — if copying fails, save the song with its original URI rather than losing it entirely.
    return song;
  }
}

/**
 * Adds or updates one song in the persisted library (matched by id), making
 * its source image durable first. Returns the durable version so the caller
 * can keep its own in-memory copy (e.g. the batch being actively reviewed)
 * pointing at the same permanent URI, instead of re-copying the image file
 * on every subsequent edit.
 */
export async function upsertSong(song: Song): Promise<Song> {
  const [durable] = await upsertSongs([song]);
  return durable;
}

/** Same as `upsertSong`, but for several songs (e.g. every page of one scanned PDF) in a single read-modify-write round trip. */
export async function upsertSongs(songs: Song[]): Promise<Song[]> {
  const durableSongs = await Promise.all(songs.map(ensureDurableImage));
  const library = await loadLibrary();
  const byId = new Map(library.map((s) => [s.id, s]));
  for (const song of durableSongs) byId.set(song.id, song);
  await saveLibrary([...byId.values()]);
  return durableSongs;
}

/** Removes one song from the persisted library. Its durable image file, if any, is left in place (harmless orphaned file, not worth the extra failure surface of deleting it here). */
export async function deleteSong(id: string): Promise<void> {
  await deleteSongs([id]);
}

/** Removes several songs at once (e.g. every page of one document) in a single read-modify-write round trip. */
export async function deleteSongs(ids: string[]): Promise<void> {
  const idSet = new Set(ids);
  const library = await loadLibrary();
  await saveLibrary(library.filter((s) => !idSet.has(s.id)));

  // Unlike a native file, an orphaned IndexedDB entry isn't just an unused
  // file sitting on disk — it counts against the same quota this whole fix
  // is about, so it's worth actually freeing on web.
  if (Platform.OS === "web") {
    await Promise.all(ids.map((id) => deleteWebImage(id).catch(() => undefined)));
  }
}
