import { describe, expect, it } from "vitest";
import { validateTicketPayload } from "../src/lib/validatePayload";

const validPayload = {
  event: "ticket.created",
  event_id: "evt_123",
  created_at: "2026-07-31T14:32:00Z",
  data: {
    ticket_id: "tick_1",
    customer_email: "jane@example.com",
    customer_name: "Jane Doe",
    subject: "Can't log in",
    body: "Something is broken",
    priority_hint: "normal",
  },
};

describe("validateTicketPayload", () => {
  it("accepts a valid payload", () => {
    const result = validateTicketPayload(validPayload);
    expect(result.valid).toBe(true);
  });

  it("accepts a payload without the optional priority_hint", () => {
    const { priority_hint, ...data } = validPayload.data;
    const result = validateTicketPayload({ ...validPayload, data });
    expect(result.valid).toBe(true);
  });

  it("rejects a missing subject", () => {
    const { subject, ...data } = validPayload.data;
    const result = validateTicketPayload({ ...validPayload, data });
    expect(result.valid).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = validateTicketPayload({
      ...validPayload,
      data: { ...validPayload.data, customer_email: "not-an-email" },
    });
    expect(result.valid).toBe(false);
  });

  it("rejects the wrong event type", () => {
    const result = validateTicketPayload({ ...validPayload, event: "ticket.updated" });
    expect(result.valid).toBe(false);
  });

  it("rejects a non-object payload", () => {
    const result = validateTicketPayload("not an object");
    expect(result.valid).toBe(false);
  });
});
