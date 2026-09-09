import { Platform } from "react-native";
import type { RefObject } from "react";
import type { View } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

function sanitizeFileName(name: string): string {
  return name.trim().replace(/[\\/:*?"<>|]/g, "_") || "song";
}

/**
 * Captures the source-overlay view (original chart with current chords
 * redrawn on it) and shares/saves it as a PNG. On native this hands the
 * captured file to the OS share sheet; on web it triggers a browser download,
 * since there's no share sheet to hand a file to.
 */
export async function exportPageAsImage(viewRef: RefObject<View | null>, title: string): Promise<void> {
  if (!viewRef.current) return;

  if (Platform.OS === "web") {
    const dataUri = await captureRef(viewRef, { format: "png", quality: 1, result: "data-uri" });
    const link = document.createElement("a");
    link.href = dataUri;
    link.download = `${sanitizeFileName(title)}.png`;
    link.click();
    return;
  }

  const fileUri = await captureRef(viewRef, { format: "png", quality: 1, result: "tmpfile" });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, { mimeType: "image/png", dialogTitle: title });
  }
}

/**
 * Captures the source-overlay view and wraps it in a single-page PDF. Native
 * uses expo-print's HTML-to-PDF renderer and hands the result to the share
 * sheet. expo-print's web shim just calls `window.print()` and ignores the
 * html it's given, so on web this instead opens the captured image in a new
 * tab and prints that tab directly — the browser's own "Save as PDF" printer
 * destination is what actually produces the PDF there.
 */
export async function exportPageAsPdf(viewRef: RefObject<View | null>, title: string): Promise<void> {
  if (!viewRef.current) return;

  const dataUri = await captureRef(viewRef, { format: "png", quality: 1, result: "data-uri" });
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>@page { margin: 0; } html,body { margin: 0; } img { display: block; width: 100%; height: auto; }</style>
    </head><body><img src="${dataUri}" /></body></html>`;

  if (Platform.OS === "web") {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: title, UTI: "com.adobe.pdf" });
  }
}
