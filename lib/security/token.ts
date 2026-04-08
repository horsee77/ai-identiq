import "server-only";
import { createHash, randomBytes } from "crypto";

export function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function randomToken(size = 48) {
  return randomBytes(size).toString("hex");
}
