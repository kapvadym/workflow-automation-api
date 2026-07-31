import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  classificationResponseSchema,
  parseClassificationResult,
  type ClassificationResult,
} from "./classification";

const MODEL_NAME = "gemini-flash-latest";

export async function classifyTicket(subject: string, body: string): Promise<ClassificationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: classificationResponseSchema,
    },
  });

  const prompt = [
    "You triage incoming customer support tickets for a small SaaS company.",
    "Classify the ticket below and produce a one-sentence summary for a Slack alert.",
    "",
    `Subject: ${subject}`,
    `Body: ${body}`,
  ].join("\n");

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new Error(`Gemini did not return valid JSON: ${(error as Error).message}`);
  }

  return parseClassificationResult(raw);
}
