import type { OcrToken } from "../types";

const VISION_ENDPOINT = "https://vision.googleapis.com/v1/images:annotate";

interface Vertex {
  x?: number;
  y?: number;
}

interface TextAnnotation {
  description: string;
  boundingPoly?: { vertices?: Vertex[] };
}

/**
 * Runs Google Cloud Vision's OCR (DOCUMENT_TEXT_DETECTION) over a base64-encoded
 * image and returns each detected word as an OcrToken with a pixel bounding
 * box, ready for groupTokensIntoLines/classifyLines/buildSongFromOcr.
 *
 * Requires a Vision API key (see EXPO_PUBLIC_GOOGLE_VISION_API_KEY in .env).
 * Throws on a non-2xx response or an API-level error payload.
 */
export async function recognizeTextWithGoogleVision(imageBase64: string, apiKey: string): Promise<OcrToken[]> {
  const response = await fetch(`${VISION_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: imageBase64 },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          imageContext: { languageHints: ["en", "ko"] },
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Vision request failed: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  const result = json?.responses?.[0];
  if (result?.error) {
    throw new Error(`Google Vision error: ${result.error.message ?? "unknown error"}`);
  }

  // textAnnotations[0] is the full block of detected text; the rest are individual words.
  const annotations: TextAnnotation[] = result?.textAnnotations ?? [];
  const wordAnnotations = annotations.slice(1);

  return wordAnnotations
    .map(annotationToToken)
    .filter((token): token is OcrToken => token !== null);
}

function annotationToToken(annotation: TextAnnotation): OcrToken | null {
  const vertices = annotation.boundingPoly?.vertices;
  const text = annotation.description?.trim();
  if (!vertices || vertices.length === 0 || !text) return null;

  const xs = vertices.map((v) => v.x ?? 0);
  const ys = vertices.map((v) => v.y ?? 0);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const width = Math.max(...xs) - x;
  const height = Math.max(...ys) - y;

  return { text, x, y, width, height };
}
