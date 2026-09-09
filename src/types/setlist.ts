/**
 * A saved song-form (송폼) — an ordered running order of songs for one
 * service or occasion, referencing songs already in the library by id
 * rather than duplicating their data. Saving and reopening a past set is
 * just persisting and reloading this list.
 */
export interface Setlist {
  id: string;
  title: string;
  /** Ordered list of library song ids — this song form's running order. */
  songIds: string[];
  /** Epoch ms, for sorting saved sets by recency. */
  updatedAt: number;
}

let idCounter = 0;

export function createSetlistId(): string {
  idCounter += 1;
  return `setlist_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

export function createEmptySetlist(title: string): Setlist {
  return {
    id: createSetlistId(),
    title,
    songIds: [],
    updatedAt: Date.now(),
  };
}
