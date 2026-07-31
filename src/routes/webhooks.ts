import { Router } from "express";
import { captureRawBody, requireRawBody, type RawBodyRequest } from "../middleware/captureRawBody";
import { verifySignature } from "../lib/signature";
import { validateTicketPayload } from "../lib/validatePayload";
import { supabase } from "../lib/supabaseClient";
import { processRun } from "../lib/pipeline";

export const webhooksRouter = Router();

const UNIQUE_VIOLATION = "23505";

webhooksRouter.post(
  "/webhooks/ticket-created",
  captureRawBody,
  requireRawBody,
  async (req: RawBodyRequest, res) => {
    const secret = process.env.WEBHOOK_SIGNING_SECRET;
    if (!secret) {
      res.status(500).json({ error: "server misconfigured: WEBHOOK_SIGNING_SECRET not set" });
      return;
    }
    const maxAgeSeconds = Number(process.env.WEBHOOK_MAX_AGE_SECONDS) || 300;

    const signatureResult = verifySignature({
      rawBody: req.rawBody!,
      signatureHeader: req.headers["x-webhook-signature"],
      timestampHeader: req.headers["x-webhook-timestamp"],
      secret,
      maxAgeSeconds,
    });

    if (!signatureResult.valid) {
      res.status(401).json({ error: "invalid signature", reason: signatureResult.reason });
      return;
    }

    const validation = validateTicketPayload(req.body);
    if (!validation.valid) {
      res.status(400).json({ error: "invalid payload", details: validation.errors });
      return;
    }

    const { payload } = validation;

    const { data, error } = await supabase
      .from("pipeline_runs")
      .insert({
        event_id: payload.event_id,
        event_type: payload.event,
        status: "received",
        payload: payload.data,
      })
      .select()
      .single();

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        const { data: existing, error: lookupError } = await supabase
          .from("pipeline_runs")
          .select()
          .eq("event_id", payload.event_id)
          .single();

        if (lookupError || !existing) {
          res.status(500).json({ error: "failed to look up existing run" });
          return;
        }

        res.status(202).json({ runId: existing.id, deduped: true, status: existing.status });
        return;
      }

      res.status(500).json({ error: "failed to record webhook", details: error.message });
      return;
    }

    res.status(202).json({ runId: data.id, deduped: false, status: "received" });

    void processRun(data.id, payload.data).catch((err) => {
      console.error(`processRun failed for run ${data.id}:`, err);
    });
  },
);
