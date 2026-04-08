import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AuditSeverity } from "@prisma/client";

type AuditPayload = {
  action: string;
  entityType: string;
  entityId?: string;
  tenantId?: string;
  userId?: string;
  severity?: AuditSeverity;
  message: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
};

export async function writeAuditLog(payload: AuditPayload) {
  await prisma.auditLog.create({
    data: {
      action: payload.action,
      entityType: payload.entityType,
      entityId: payload.entityId,
      tenantId: payload.tenantId,
      userId: payload.userId,
      severity: payload.severity ?? "MEDIUM",
      message: payload.message,
      metadata: payload.metadata as Prisma.InputJsonValue | undefined,
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent,
    },
  });
}
