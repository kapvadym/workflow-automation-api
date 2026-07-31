import { describe, expect, it } from "vitest";
import { signPayload, verifySignature } from "../src/lib/signature";

const secret = "test-secret";
const rawBody = Buffer.from(JSON.stringify({ hello: "world" }));

describe("verifySignature", () => {
  it("accepts a correctly signed, fresh request", () => {
    const now = Math.floor(Date.now() / 1000);
    const timestamp = now.toString();
    const signature = signPayload(secret, timestamp, rawBody);

    const result = verifySignature({
      rawBody,
      signatureHeader: signature,
      timestampHeader: timestamp,
      secret,
      maxAgeSeconds: 300,
      now,
    });

    expect(result.valid).toBe(true);
  });

  it("rejects a wrong signature", () => {
    const now = Math.floor(Date.now() / 1000);
    const timestamp = now.toString();

    const result = verifySignature({
      rawBody,
      signatureHeader: "0".repeat(64),
      timestampHeader: timestamp,
      secret,
      maxAgeSeconds: 300,
      now,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("bad_signature");
  });

  it("rejects a stale timestamp", () => {
    const now = Math.floor(Date.now() / 1000);
    const timestamp = (now - 10_000).toString();
    const signature = signPayload(secret, timestamp, rawBody);

    const result = verifySignature({
      rawBody,
      signatureHeader: signature,
      timestampHeader: timestamp,
      secret,
      maxAgeSeconds: 300,
      now,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("stale_timestamp");
  });

  it("rejects missing headers", () => {
    const result = verifySignature({
      rawBody,
      signatureHeader: undefined,
      timestampHeader: undefined,
      secret,
      maxAgeSeconds: 300,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("missing_headers");
  });

  it("rejects a signature computed over a different body", () => {
    const now = Math.floor(Date.now() / 1000);
    const timestamp = now.toString();
    const signature = signPayload(secret, timestamp, Buffer.from("something else"));

    const result = verifySignature({
      rawBody,
      signatureHeader: signature,
      timestampHeader: timestamp,
      secret,
      maxAgeSeconds: 300,
      now,
    });

    expect(result.valid).toBe(false);
  });
});
