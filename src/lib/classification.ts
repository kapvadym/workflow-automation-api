import { SchemaType, type Schema } from "@google/generative-ai";
import { z } from "zod";

export const CATEGORY_VALUES = [
  "billing",
  "technical",
  "account",
  "feature_request",
  "other",
] as const;

export const URGENCY_VALUES = ["low", "medium", "high", "critical"] as const;

export const SENTIMENT_VALUES = ["positive", "neutral", "negative"] as const;

export const classificationResponseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    category: {
      type: SchemaType.STRING,
      format: "enum",
      enum: [...CATEGORY_VALUES],
      description: "The best-matching category for this support ticket.",
    },
    urgency: {
      type: SchemaType.STRING,
      format: "enum",
      enum: [...URGENCY_VALUES],
      description: "How urgently this ticket needs a human response.",
    },
    sentiment: {
      type: SchemaType.STRING,
      format: "enum",
      enum: [...SENTIMENT_VALUES],
      description: "The customer's emotional tone in the ticket.",
    },
    summary: {
      type: SchemaType.STRING,
      description: "A one-sentence summary of the issue for a triage alert.",
    },
  },
  required: ["category", "urgency", "sentiment", "summary"],
};

const classificationResultSchema = z.object({
  category: z.enum(CATEGORY_VALUES),
  urgency: z.enum(URGENCY_VALUES),
  sentiment: z.enum(SENTIMENT_VALUES),
  summary: z.string().min(1),
});

export type ClassificationResult = z.infer<typeof classificationResultSchema>;

export function parseClassificationResult(raw: unknown): ClassificationResult {
  const result = classificationResultSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Gemini classification response did not match expected shape: ${result.error.message}`,
    );
  }
  return result.data;
}
