import { forwardRef, useImperativeHandle, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

const PDFJS_VERSION = "6.3.289";

/**
 * Runs inside the hidden WebView. Loads pdf.js as an ES module (this version
 * of pdf.js on cdnjs only ships .mjs builds, no UMD/global script), renders
 * every page of a base64-encoded PDF onto an offscreen canvas, and posts each
 * page back as a base64 PNG with its pixel dimensions.
 *
 * A message handler is attached to both `document` and `window` because
 * react-native-webview delivers an injected postMessage on `document` on
 * Android but on `window` on iOS.
 */
const RENDERER_HTML = `<!doctype html>
<html>
<body style="margin:0">
<script type="module">
import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs";

function post(message) {
  window.ReactNativeWebView.postMessage(JSON.stringify(message));
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function renderPages(base64) {
  const pdf = await pdfjsLib.getDocument({ data: base64ToBytes(base64) }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    await page.render({ canvasContext: context, viewport }).promise;
    pages.push({
      base64: canvas.toDataURL("image/png").split(",")[1],
      width: viewport.width,
      height: viewport.height,
    });
  }
  return pages;
}

function handleMessage(event) {
  let payload;
  try {
    payload = JSON.parse(event.data);
  } catch {
    return;
  }
  renderPages(payload.base64)
    .then((pages) => post({ requestId: payload.requestId, type: "done", pages }))
    .catch((error) =>
      post({ requestId: payload.requestId, type: "error", message: String((error && error.message) || error) })
    );
}

document.addEventListener("message", handleMessage);
window.addEventListener("message", handleMessage);
</script>
</body>
</html>`;

export interface PdfPage {
  base64: string;
  width: number;
  height: number;
}

export interface PdfPageRendererHandle {
  /** Rasterizes every page of a base64-encoded PDF, resolving to one entry per page. */
  renderPages: (base64Pdf: string) => Promise<PdfPage[]>;
}

interface PendingRequest {
  resolve: (pages: PdfPage[]) => void;
  reject: (error: Error) => void;
}

/**
 * Invisible host for the pdf.js WebView used to turn a picked PDF into page
 * images before running them through the same OCR pipeline as a photo.
 * Mount once and drive it via the ref; it renders nothing visible.
 */
export const PdfPageRenderer = forwardRef<PdfPageRendererHandle>((_props, ref) => {
  const webViewRef = useRef<WebView>(null);
  const pending = useRef(new Map<string, PendingRequest>());

  useImperativeHandle(ref, () => ({
    renderPages(base64Pdf: string) {
      return new Promise<PdfPage[]>((resolve, reject) => {
        const requestId = createRequestId();
        pending.current.set(requestId, { resolve, reject });
        webViewRef.current?.postMessage(JSON.stringify({ requestId, base64: base64Pdf }));
      });
    },
  }));

  function onMessage(event: WebViewMessageEvent) {
    let payload: { requestId: string; type: "done" | "error"; pages?: PdfPage[]; message?: string };
    try {
      payload = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    const request = pending.current.get(payload.requestId);
    if (!request) return;
    pending.current.delete(payload.requestId);

    if (payload.type === "done" && payload.pages) {
      request.resolve(payload.pages);
    } else {
      request.reject(new Error(payload.message ?? "PDF 렌더링에 실패했습니다."));
    }
  }

  return (
    <View style={styles.hidden}>
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: RENDERER_HTML }}
        onMessage={onMessage}
        javaScriptEnabled
      />
    </View>
  );
});

function createRequestId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

const styles = StyleSheet.create({
  hidden: {
    width: 1,
    height: 1,
    opacity: 0,
    pointerEvents: "none",
  },
});
