import { ChannelType } from "@prisma/client";

export type ChannelContext = {
  channel: ChannelType;
  externalUserId?: string;
  metadata?: Record<string, unknown>;
};

export function normalizeChannel(channel?: string): ChannelType {
  if (!channel) return "DASHBOARD";
  const upper = channel.toUpperCase();
  if (
    upper === "WEB_CHAT" ||
    upper === "DASHBOARD" ||
    upper === "API" ||
    upper === "WHATSAPP" ||
    upper === "EMAIL" ||
    upper === "WIDGET" ||
    upper === "CRM"
  ) {
    return upper;
  }
  return "DASHBOARD";
}
