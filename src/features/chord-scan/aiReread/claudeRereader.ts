import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

import type { ChordRereader, RereadRequest, RereadResult } from "./types";

const MODEL = "claude-opus-5-5";

const SYSTEM_PROMPT = `You re-read chord symbols on a scanned worship-music chart (lead sheet or chord chart, often Korean CCM).

An OCR engine already read the page. Some of its readings are garbled or likely wrong, and you're given the location of each one. For every item, look at that exact spot on the image and report what is printed there.

- Transcribe what is printed, not what the harmony suggests. If you can't make it out, answer "unsure" — a wrong chord that looks plausible is worse than no answer, because musicians will play it.
- Write chords in plain text: # and b for accidentals, superscript extensions as normal digits (C² → C2, C⁷ → C7), parentheses as printed (A(add2)), slash chords as Root/Bass.
- If one location holds several chords that OCR merged, list them left to right.
- Volta brackets ("1.", "2."), measure numbers, and other markings are not chords; if a chord sits next to one, return only the chord.
- Answer for every item id given, and only those.`;

const RereadResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["chords", "not_chord", "unsure"]),
      chords: z.array(z.string()),
      confidence: z.enum(["high", "low"]),
    })
  ),
});

/**
 * Re-reads flagged chords with Claude.
 *
 * LOCAL TESTING ONLY: the key comes from EXPO_PUBLIC_ANTHROPIC_API_KEY,
 * which is inlined into the app bundle. Before any build leaves this
 * machine, this must move behind a server proxy (roadmap 1.6).
 */
export function createClaudeRereader(apiKey: string): ChordRereader {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  return {
    async reread(request: RereadRequest): Promise<RereadResult[]> {
      const response = await client.beta.messages.parse({
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium", format: betaZodOutputFormat(RereadResponseSchema) },
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: request.image.mediaType, data: request.image.base64 },
              },
              { type: "text", text: describeRequest(request) },
            ],
          },
        ],
      });

      if (response.stop_reason === "refusal") {
        throw new Error("AI가 이 요청을 처리하지 않았습니다.");
      }
      const parsed = response.parsed_output;
      if (!parsed) throw new Error("AI 응답을 해석하지 못했습니다.");

      return parsed.items.map((item): RereadResult => {
        const confident = item.confidence === "high";
        if (item.kind === "chords") return { id: item.id, kind: "chords", chords: item.chords, confident };
        if (item.kind === "not_chord") return { id: item.id, kind: "not_chord", confident };
        return { id: item.id, kind: "unsure" };
      });
    },
  };
}

function describeRequest(request: RereadRequest): string {
  const { width, height } = request.image;
  const lines = request.items.map((item) => {
    const { x, y, width: w, height: h } = item.bbox;
    const box = `x=${Math.round(x)}, y=${Math.round(y)}, w=${Math.round(w)}, h=${Math.round(h)}`;
    const ocr = item.ocrText !== null ? `OCR read "${item.ocrText}"` : "OCR reading not available";
    return `- id ${item.id}: box ${box}; ${ocr}`;
  });
  return [
    `Image size: ${width}×${height} px. Boxes are in those pixels, origin top-left.`,
    request.printedKey ? `The chart's key appears to be ${request.printedKey}.` : "The chart's key is unknown.",
    "",
    "Items to re-read:",
    ...lines,
  ].join("\n");
}

/** Reads the dev-only key; null means the feature is off. */
export function getAnthropicApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  return key && key.length > 0 ? key : null;
}
