export interface TicketCreatedData {
  ticket_id: string;
  customer_email: string;
  customer_name: string;
  subject: string;
  body: string;
  priority_hint?: string;
}

export interface TicketCreatedWebhook {
  event: "ticket.created";
  event_id: string;
  created_at: string;
  data: TicketCreatedData;
}
