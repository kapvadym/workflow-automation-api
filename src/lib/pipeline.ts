import { supabase } from "./supabaseClient";
import { classifyTicket } from "./gemini";
import { buildSlackMessage, sendSlackMessage } from "./slack";
import { withRetry } from "./retry";
import type { TicketCreatedData } from "../types";

const RETRY_OPTIONS = { retries: 1, backoffMs: 1500 };

async function patchRun(runId: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await supabase
    .from("pipeline_runs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", runId);

  if (error) {
    console.error(`Failed to update pipeline_runs row ${runId}:`, error.message);
  }
}

export async function processRun(runId: string, payload: TicketCreatedData): Promise<void> {
  await patchRun(runId, { status: "enriching" });

  let enrichment;
  try {
    enrichment = await withRetry(() => classifyTicket(payload.subject, payload.body), RETRY_OPTIONS);
  } catch (error) {
    await patchRun(runId, {
      status: "failed",
      error: { stage: "enrichment", message: (error as Error).message },
    });
    return;
  }

  await patchRun(runId, { status: "forwarding", enrichment });

  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhookUrl) {
    await patchRun(runId, {
      status: "failed",
      error: { stage: "forwarding", message: "SLACK_WEBHOOK_URL is not set" },
    });
    return;
  }

  try {
    const message = buildSlackMessage(payload, enrichment);
    const responseSnippet = await withRetry(
      () => sendSlackMessage(slackWebhookUrl, message),
      RETRY_OPTIONS,
    );
    await patchRun(runId, {
      status: "completed",
      forwarding: { channel: "slack", success: true, responseSnippet: responseSnippet.slice(0, 200) },
    });
  } catch (error) {
    await patchRun(runId, {
      status: "failed",
      error: { stage: "forwarding", message: (error as Error).message },
    });
  }
}
