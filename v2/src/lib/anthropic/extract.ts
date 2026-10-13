/**
 * Drop extraction (PRD §6): screenshots and/or text → structured place JSON.
 * Server-side only. The model comes from ANTHROPIC_MODEL; structured output is
 * enforced with a JSON schema, so the result is always valid JSON.
 */
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";

export type DropImage = { mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; base64: string };

export interface DropInput {
  images?: DropImage[];
  text?: string;
  url?: string;
  caption?: string;
}

export interface ExtractedPlace {
  name: string;
  name_ja: string | null;
  city_or_area: string | null;
  type: string;
  dishes: string[];
  price_hint: string | null;
  why: string;
  source_handle: string | null;
  confidence: "high" | "medium" | "low";
}

export interface DropExtraction {
  places: ExtractedPlace[];
  summary: string;
}

const SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "One sentence on what this drop is about" },
    places: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Place name as written, romanised if needed" },
          name_ja: { type: ["string", "null"], description: "Japanese name if shown" },
          city_or_area: { type: ["string", "null"], description: "City, neighbourhood or station" },
          type: { type: "string", description: "ramen, bar, cafe, sight, museum, shop, onsen, other…" },
          dishes: { type: "array", items: { type: "string" } },
          price_hint: { type: ["string", "null"] },
          why: { type: "string", description: "One short line on why it was recommended" },
          source_handle: { type: ["string", "null"], description: "The @account credited, if visible" },
          confidence: { type: "string", enum: ["high", "medium", "low"], description: "How sure you are this is a real, specific place" },
        },
        required: ["name", "name_ja", "city_or_area", "type", "dishes", "price_hint", "why", "source_handle", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "places"],
  additionalProperties: false,
} as const;

export function anthropicModel(): string {
  return process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
}

export async function extractPlacesFromDrop(input: DropInput): Promise<DropExtraction> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic();
  const content: Anthropic.ContentBlockParam[] = [];
  for (const img of input.images ?? []) {
    content.push({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.base64 } });
  }
  const parts = [
    "Extract every specific place (restaurant, bar, cafe, sight, shop, onsen…) mentioned in these screenshots and text from a Japan trip recommendation.",
    "Skip generic mentions (\"a ramen place\") unless a name is given. Keep names as written; add the Japanese name only if it is visible.",
    "Credit the original account handle if visible. If nothing is a place, return an empty list.",
    input.caption ? `The person who dropped this wrote: ${input.caption}` : "",
    input.url ? `Link shared: ${input.url}` : "",
    input.text ? `Text:\n${input.text}` : "",
  ].filter(Boolean);
  content.push({ type: "text", text: parts.join("\n\n") });

  const response = await client.messages.parse({
    model: anthropicModel(),
    max_tokens: 4096,
    messages: [{ role: "user", content }],
    output_config: { format: jsonSchemaOutputFormat(SCHEMA) },
  });
  if (response.stop_reason === "refusal") throw new Error("The model declined to read this drop");
  const parsed = response.parsed_output as DropExtraction | null;
  if (!parsed) throw new Error("No structured output returned");
  return parsed;
}
