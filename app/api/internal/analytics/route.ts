import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireInternalPermission } from "@/lib/api/internal-auth";
import { getAnalyticsOverview } from "@/lib/analytics/service";

export const GET = withApiHandler(async (_request, requestId) => {
  const context = await requireInternalPermission("analytics.view");
  const overview = await getAnalyticsOverview(context.tenantId);
  return ok(requestId, overview);
});
