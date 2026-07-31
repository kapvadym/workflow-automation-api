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

export type PipelineRunStatus = "received" | "enriching" | "forwarding" | "completed" | "failed";

export interface PipelineRunError {
  stage: string;
  message: string;
}

export interface PipelineRunForwarding {
  channel: string;
  success: boolean;
  responseSnippet?: string;
}

export interface PipelineRun {
  id: string;
  event_id: string;
  event_type: string;
  status: PipelineRunStatus;
  received_at: string;
  payload: TicketCreatedData;
  enrichment: import("./lib/classification").ClassificationResult | null;
  forwarding: PipelineRunForwarding | null;
  error: PipelineRunError | null;
  updated_at: string;
}
