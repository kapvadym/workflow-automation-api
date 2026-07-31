# Workflow Automation API

A webhook-triggered automation pipeline: verify an incoming webhook,
classify it with an LLM, and forward a triage alert to Slack — instead of
a human skimming every incoming ticket to figure out what's urgent.

## Why this exists

Support teams get flooded with tickets of wildly different urgency, and
someone has to read every single one just to figure out which three need
attention *right now*. This project automates that first-pass triage:
a support-desk product ("Acme Helpdesk") fires a `ticket.created`
webhook, this service verifies it's genuinely from that source, asks
Gemini to classify its category/urgency/sentiment and summarize it, and
posts a triage alert to Slack — so a team's `#support-triage` channel
already tells them what's on fire before anyone opens a ticket.

This mirrors the "webhook automation / integration glue" category of
freelance work (Zapier-replacement-style backend jobs: receive an event,
enrich it, route it somewhere useful).

## Architecture at a glance

```
POST /webhooks/ticket-created
  -> verify HMAC-SHA256 signature + timestamp freshness   (401 if invalid)
  -> validate payload shape (zod)                          (400 if invalid)
  -> insert into Supabase `pipeline_runs` (status: received)
     - unique constraint on event_id makes duplicate deliveries a no-op
  -> respond 202 immediately (runId, deduped, status)
  -> asynchronously:
       classify with Gemini (category / urgency / sentiment / summary)
       -> post a formatted alert to a Slack Incoming Webhook
       -> update the row's status the whole way: received -> enriching
          -> forwarding -> completed (or failed, with the stage and
          error recorded)
```

- `src/routes/webhooks.ts` — the webhook endpoint.
- `src/lib/signature.ts` — HMAC-SHA256 signature + timestamp verification.
- `src/lib/validatePayload.ts` — zod schema for the ticket payload.
- `src/lib/pipeline.ts` — the enrich-then-forward orchestrator.
- `src/lib/gemini.ts` / `src/lib/classification.ts` — Gemini call with a
  structured JSON response schema (enums for category/urgency/sentiment,
  not free-text labels).
- `src/lib/slack.ts` — builds and sends the Slack message.
- `src/routes/runs.ts` — `GET /runs` and `GET /runs/:id`, for inspecting
  pipeline state (this is how the live verification below was checked).
- `supabase/schema.sql` — the `pipeline_runs` table.

## Tech stack

Node.js · Express · TypeScript · Supabase (Postgres) · Google Gemini
(`gemini-flash-latest`, structured JSON output) · Slack Incoming Webhooks
· Vitest

## A deliberately untrusted field

The inbound payload includes a customer-supplied `priority_hint` — this is
never used for anything. Gemini's own `urgency` classification is the
only urgency signal this system trusts, since a customer's self-reported
priority is exactly the thing a triage system exists to second-guess.

## Key features

- **Signed webhooks, verified properly**: HMAC-SHA256 over the raw body
  (before JSON parsing), constant-time comparison, and a timestamp
  freshness check to reject replays.
- **Idempotent by construction**: a unique constraint on `event_id` in
  Postgres — not app-level locking — means a duplicate delivery is
  detected by the database itself and returns the original run instead of
  double-processing.
- **Structured LLM output, not parsed free text**: Gemini is constrained
  to a JSON schema with enum fields for category/urgency/sentiment, which
  is measurably more reliable than parsing labels out of prose.
- **Failure is visible, not silent**: one retry with a fixed backoff per
  external call (Gemini, Slack); if both attempts fail, the run is marked
  `failed` with the stage and error message recorded — inspectable via
  `GET /runs/:id`, never just dropped.

## How to run locally

```bash
npm install
cp .env.example .env   # fill in SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY,
                        # WEBHOOK_SIGNING_SECRET, SLACK_WEBHOOK_URL
```

Apply `supabase/schema.sql` once against your Supabase project (SQL
editor or migration tooling) — it creates the `pipeline_runs` table, its
status check constraint, and RLS policies.

Generate a signing secret if you don't have one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```bash
npm run dev   # starts the API on http://localhost:3000
```

Send a signed test webhook against the running server:

```bash
npm run send-test-webhook -- docs/sample-payloads/ticket-created-urgent.json
```

Then check `GET http://localhost:3000/runs/<runId>` to watch it progress
through `received -> enriching -> forwarding -> completed`.

## Tests

```bash
npm test
```

21 tests covering the pure logic — signature verification, payload
validation, Gemini response parsing, Slack message building, and the
retry helper — with no network calls, so they run identically in CI and
locally. The Gemini/Supabase/Slack integration itself is exercised by
live testing (see below), since it depends on real external calls.

**Verified live end-to-end**: ran the real server against the real
Supabase project and a real Gemini key. Sent a signed webhook and watched
a real classification come back (`feature_request` / `low` urgency /
`neutral` sentiment, with an accurate one-sentence summary) and the row
progress through Supabase in real time. Re-sent the identical payload and
confirmed the unique-constraint dedupe kicked in (`deduped: true`, same
`runId`, no reprocessing). Confirmed a tampered signature and a stale
timestamp both return `401`, and a payload missing a required field
returns `400` with a specific error. Confirmed the failure path itself
works, not just the happy path: with no Slack webhook configured, a run
correctly lands in `status: "failed"` with `error.stage: "forwarding"`
recorded, instead of silently hanging. Once a real Slack Incoming Webhook
was wired up, confirmed the full happy path too: a real ticket produced a
real Gemini classification (`urgency: "high"`, `category: "account"`,
`sentiment: "negative"`) and a real message landed in the Slack channel,
with the run correctly reaching `status: "completed"`.

## What I'd do next / limitations

- **No scheduler-level durability**: processing happens as a
  fire-and-forget async call after the webhook is acknowledged. If the
  process crashes between the 202 response and Slack delivery, that run
  stays parked at whatever status it last reached rather than being
  auto-resumed. A production version would want either a small
  outbox/worker table with a periodic sweep, or a real queue (this was a
  deliberate tradeoff of choosing Supabase over a scheduler-based backend
  for a project with no live frontend to justify the extra machinery).
- **One retry, fixed backoff, no dead-letter queue** — appropriately
  scoped for a demo; a production system would want exponential backoff
  and a proper DLQ for permanently-failed events.
- **Slack only** — the architecture (`src/lib/slack.ts` alongside a
  hypothetical `src/lib/email.ts`) leaves room for a second forwarding
  channel without restructuring, just not built for v1.
- **`GET /runs` has no auth** — fine for local debugging/demo purposes,
  not something you'd expose unauthenticated in production.

## License

MIT
