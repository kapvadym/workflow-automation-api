import "dotenv/config";
import { readFileSync } from "node:fs";
import { signPayload } from "../src/lib/signature";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npm run send-test-webhook -- <path-to-payload.json>");
    process.exit(1);
  }

  const secret = process.env.WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    console.error("WEBHOOK_SIGNING_SECRET is not set");
    process.exit(1);
  }

  const port = process.env.PORT || "3000";
  const targetUrl = `http://localhost:${port}/webhooks/ticket-created`;

  const rawBody = readFileSync(filePath);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signPayload(secret, timestamp, rawBody);

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Signature": signature,
      "X-Webhook-Timestamp": timestamp,
    },
    body: rawBody,
  });

  const text = await response.text();
  console.log(`${response.status} ${response.statusText}`);
  console.log(text);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
