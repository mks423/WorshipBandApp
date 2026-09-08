export { recognizeTextWithGoogleVision } from "./googleVisionOcr";

/** Reads the Google Vision API key from the EXPO_PUBLIC_GOOGLE_VISION_API_KEY env var (see .env.example). */
export function getGoogleVisionApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY;
  return key && key.length > 0 ? key : null;
}
