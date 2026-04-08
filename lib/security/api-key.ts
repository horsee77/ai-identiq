import "server-only";
import { createHash } from "crypto";

export function hashApiKey(rawKey: string) {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function maskApiKey(rawKey: string) {
  if (rawKey.length <= 8) {
    return "****";
  }
  return `${rawKey.slice(0, 6)}...${rawKey.slice(-4)}`;
}
