import { describe, expect, it, vi } from "vitest";
import { withRetry } from "../src/lib/retry";

describe("withRetry", () => {
  it("returns the result on the first successful attempt", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { retries: 1, backoffMs: 1 });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries once after a failure, then succeeds", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("ok");
    const result = await withRetry(fn, { retries: 1, backoffMs: 1 });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws the last error once retries are exhausted", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));

    await expect(withRetry(fn, { retries: 1, backoffMs: 1 })).rejects.toThrow("boom");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
