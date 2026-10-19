import { File } from "expo-file-system";
import { Platform } from "react-native";

import type { ImageMediaType } from "../features/chord-scan/aiReread/types";
import { resolveWebImageUri } from "./webImageStore";

/**
 * Reads a song's stored source image back as base64, for sending to an
 * image API. Handles every form a saved image URI can take: an inline data
 * URI, a native file URI, or (on web) a wba-idb:// IndexedDB reference.
 */
export async function loadImageBase64(uri: string): Promise<{ base64: string; mediaType: ImageMediaType }> {
  const base64 = await readBase64(uri);
  return { base64, mediaType: detectMediaType(base64) };
}

async function readBase64(uri: string): Promise<string> {
  if (uri.startsWith("data:")) return uri.slice(uri.indexOf(",") + 1);

  if (Platform.OS === "web") {
    const resolved = await resolveWebImageUri(uri);
    if (!resolved) throw new Error("저장된 악보 이미지를 찾지 못했습니다.");
    try {
      const blob = await (await fetch(resolved)).blob();
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      return dataUri.slice(dataUri.indexOf(",") + 1);
    } finally {
      if (resolved !== uri && resolved.startsWith("blob:")) URL.revokeObjectURL(resolved);
    }
  }

  return new File(uri).base64();
}

/** Identifies the format from the file's leading bytes rather than trusting a file extension. */
function detectMediaType(base64: string): ImageMediaType {
  if (base64.startsWith("/9j/")) return "image/jpeg";
  if (base64.startsWith("R0lGOD")) return "image/gif";
  if (base64.startsWith("UklGR")) return "image/webp";
  return "image/png";
}
