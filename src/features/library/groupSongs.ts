import type { Song } from "../../types/song";

export interface SongGroup {
  /** A song's id, or a multi-page document's shared groupId — the key other screens select/delete/reference by. */
  key: string;
  title: string;
  originalKey: string | null;
  pageCount: number;
}

/** Collapses the pages of one imported document (sharing a `groupId`) into a single entry, like ForScore's PDF entries — a standalone song (no groupId) is its own one-page "group". */
export function groupSongs(songs: Song[]): SongGroup[] {
  const order: string[] = [];
  const byKey = new Map<string, Song[]>();
  for (const song of songs) {
    const key = song.groupId ?? song.id;
    if (!byKey.has(key)) order.push(key);
    byKey.set(key, [...(byKey.get(key) ?? []), song]);
  }
  return order.map((key) => {
    const pages = [...(byKey.get(key) ?? [])].sort((a, b) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0));
    const first = pages[0];
    return { key, title: first.title, originalKey: first.originalKey, pageCount: pages.length };
  });
}
