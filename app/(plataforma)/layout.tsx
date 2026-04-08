import { ReactNode } from "react";
import { requireSession } from "@/lib/auth/access";
import { PlatformShell } from "@/components/layout/platform-shell";

export default async function PlataformaLayout({ children }: { children: ReactNode }) {
  const context = await requireSession();
  const currentTenant =
    context.memberships.find((membership) => membership.tenantId === context.tenantId) ?? context.memberships[0];

  return (
    <PlatformShell
      userName={context.name}
      tenantName={currentTenant?.tenantName ?? "Tenant"}
      memberships={context.memberships.map((membership) => ({
        tenantId: membership.tenantId,
        tenantName: membership.tenantName,
      }))}
    >
      {children}
    </PlatformShell>
  );
}
