import { describe, expect, it } from "vitest";
import { buildSlackMessage } from "../src/lib/slack";

const ticket = {
  ticket_id: "tick_1",
  customer_name: "Jane Doe",
  customer_email: "jane@example.com",
  subject: "Can't log in",
};

describe("buildSlackMessage", () => {
  it("includes the urgency emoji and subject in the headline", () => {
    const message = buildSlackMessage(ticket, {
      category: "technical",
      urgency: "critical",
      sentiment: "negative",
      summary: "Customer is locked out.",
    });

    expect(message.text).toContain("🔴");
    expect(message.text).toContain("Can't log in");
  });

  it("includes the ticket id, category, and summary in the block text", () => {
    const message = buildSlackMessage(ticket, {
      category: "billing",
      urgency: "low",
      sentiment: "neutral",
      summary: "Wants a CSV export.",
    });

    const blockText = JSON.stringify(message.blocks);
    expect(blockText).toContain("tick_1");
    expect(blockText).toContain("billing");
    expect(blockText).toContain("Wants a CSV export.");
  });

  it("uses a distinct emoji per urgency level", () => {
    const urgencies = ["low", "medium", "high", "critical"] as const;
    const emojis = urgencies.map(
      (urgency) =>
        buildSlackMessage(ticket, {
          category: "other",
          urgency,
          sentiment: "neutral",
          summary: "x",
        }).text,
    );

    expect(new Set(emojis).size).toBe(urgencies.length);
  });
});
