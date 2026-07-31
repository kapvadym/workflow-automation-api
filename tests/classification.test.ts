import { describe, expect, it } from "vitest";
import { parseClassificationResult } from "../src/lib/classification";

describe("parseClassificationResult", () => {
  it("accepts a well-formed classification result", () => {
    const result = parseClassificationResult({
      category: "technical",
      urgency: "high",
      sentiment: "negative",
      summary: "Customer cannot log in after a password reset.",
    });

    expect(result.category).toBe("technical");
    expect(result.urgency).toBe("high");
  });

  it("rejects an invalid enum value", () => {
    expect(() =>
      parseClassificationResult({
        category: "technical",
        urgency: "super-duper-urgent",
        sentiment: "negative",
        summary: "x",
      }),
    ).toThrow();
  });

  it("rejects a missing field", () => {
    expect(() =>
      parseClassificationResult({
        category: "technical",
        urgency: "high",
        sentiment: "negative",
      }),
    ).toThrow();
  });

  it("rejects a non-object input", () => {
    expect(() => parseClassificationResult("not an object")).toThrow();
  });
});
