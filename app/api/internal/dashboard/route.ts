import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireInternalPermission } from "@/lib/api/internal-auth";
import { getDashboardMetrics } from "@/lib/repositories/dashboard";

export const GET = withApiHandler(async (_request, requestId) => {
  const context = await requireInternalPermission("dashboard.view");
  const metrics = await getDashboardMetrics(context.tenantId);
  return ok(requestId, metrics);
});
