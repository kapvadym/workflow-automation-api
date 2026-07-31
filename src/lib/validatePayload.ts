import { z } from "zod";
import type { TicketCreatedWebhook } from "../types";

const ticketDataSchema = z.object({
  ticket_id: z.string().min(1),
  customer_email: z.string().email(),
  customer_name: z.string().min(1),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(10_000),
  priority_hint: z.string().optional(),
});

export const ticketCreatedSchema = z.object({
  event: z.literal("ticket.created"),
  event_id: z.string().min(1),
  created_at: z.string().min(1),
  data: ticketDataSchema,
});

export type ValidatePayloadResult =
  | { valid: true; payload: TicketCreatedWebhook }
  | { valid: false; errors: string[] };

export function validateTicketPayload(json: unknown): ValidatePayloadResult {
  const result = ticketCreatedSchema.safeParse(json);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    };
  }
  return { valid: true, payload: result.data };
}
