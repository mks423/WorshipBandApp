import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Setlist } from "../../types/setlist";

const STORAGE_KEY = "wba.setlists.v1";

/** Reads every saved song form. Never throws — a corrupt/missing entry just comes back as an empty list. */
export async function loadSetlists(): Promise<Setlist[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Setlist[]) : [];
  } catch {
    return [];
  }
}

async function saveSetlists(setlists: Setlist[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(setlists));
}

/** Adds or updates one song form (matched by id), bumping `updatedAt`. */
export async function upsertSetlist(setlist: Setlist): Promise<Setlist> {
  const withTimestamp = { ...setlist, updatedAt: Date.now() };
  const setlists = await loadSetlists();
  const index = setlists.findIndex((s) => s.id === withTimestamp.id);
  const next = index === -1 ? [...setlists, withTimestamp] : setlists.map((s, i) => (i === index ? withTimestamp : s));
  await saveSetlists(next);
  return withTimestamp;
}

export async function deleteSetlist(id: string): Promise<void> {
  const setlists = await loadSetlists();
  await saveSetlists(setlists.filter((s) => s.id !== id));
}
