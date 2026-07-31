import type { NextFunction, Request, Response } from "express";
import express from "express";

export interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

export const captureRawBody = express.json({
  verify: (req: RawBodyRequest, _res: Response, buf: Buffer) => {
    req.rawBody = Buffer.from(buf);
  },
});

export function requireRawBody(req: RawBodyRequest, res: Response, next: NextFunction) {
  if (!req.rawBody) {
    res.status(400).json({ error: "missing request body" });
    return;
  }
  next();
}
