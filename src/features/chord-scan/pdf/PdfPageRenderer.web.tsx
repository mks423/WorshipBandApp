import { forwardRef, useImperativeHandle } from "react";
import * as pdfjsLib from "pdfjs-dist";

import type { PdfPage, PdfPageRendererHandle } from "./types";

const PDFJS_VERSION = "6.3.289";
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

/**
 * Web counterpart to PdfPageRenderer.tsx. On native, rasterizing a PDF needs
 * a WebView because that's the only way to get a real browser engine to run
 * pdf.js in. On web, the app *is* already running in a browser, so pdf.js
 * can render straight to a canvas here with no wrapper at all — this file
 * exists purely because react-native-webview has no web implementation, not
 * because OCR itself is platform-specific (the actual text recognition is a
 * plain HTTP call to Google Vision, identical on every platform).
 *
 * Same module name as PdfPageRenderer.tsx with a .web suffix, so Metro's web
 * bundler picks this file automatically and every other platform keeps
 * using the WebView-based one — callers never need to know which runs.
 */
export const PdfPageRenderer = forwardRef<PdfPageRendererHandle>((_props, ref) => {
  useImperativeHandle(ref, () => ({
    async renderPages(base64Pdf: string): Promise<PdfPage[]> {
      const pdf = await pdfjsLib.getDocument({ data: base64ToBytes(base64Pdf) }).promise;
      const pages: PdfPage[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvas, viewport }).promise;
        pages.push({
          base64: canvas.toDataURL("image/png").split(",")[1],
          width: viewport.width,
          height: viewport.height,
        });
      }

      return pages;
    },
  }));

  return null;
});

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
