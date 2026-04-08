import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireInternalPermission } from "@/lib/api/internal-auth";
import { getBillingSnapshot } from "@/lib/billing/service";

export const GET = withApiHandler(async (_request, requestId) => {
  const context = await requireInternalPermission("billing.view");
  const snapshot = await getBillingSnapshot(context.tenantId);
  return ok(requestId, snapshot);
});
