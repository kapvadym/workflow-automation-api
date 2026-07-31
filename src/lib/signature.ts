import { createHmac, timingSafeEqual } from "node:crypto";

export interface VerifySignatureParams {
  rawBody: Buffer;
  signatureHeader: string | string[] | undefined;
  timestampHeader: string | string[] | undefined;
  secret: string;
  maxAgeSeconds: number;
  now?: number;
}

export type VerifySignatureResult =
  | { valid: true }
  | { valid: false; reason: "missing_headers" | "bad_timestamp" | "stale_timestamp" | "bad_signature" };

function computeSignature(secret: string, timestamp: string, rawBody: Buffer): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(rawBody)
    .digest("hex");
}

export function verifySignature(params: VerifySignatureParams): VerifySignatureResult {
  const { rawBody, secret, maxAgeSeconds } = params;
  const signatureHeader = Array.isArray(params.signatureHeader) ? params.signatureHeader[0] : params.signatureHeader;
  const timestampHeader = Array.isArray(params.timestampHeader) ? params.timestampHeader[0] : params.timestampHeader;

  if (!signatureHeader || !timestampHeader) {
    return { valid: false, reason: "missing_headers" };
  }

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) {
    return { valid: false, reason: "bad_timestamp" };
  }

  const now = params.now ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > maxAgeSeconds) {
    return { valid: false, reason: "stale_timestamp" };
  }

  const expected = computeSignature(secret, timestampHeader, rawBody);
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signatureHeader, "hex");

  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return { valid: false, reason: "bad_signature" };
  }

  return { valid: true };
}

export function signPayload(secret: string, timestamp: string, rawBody: Buffer): string {
  return computeSignature(secret, timestamp, rawBody);
}
