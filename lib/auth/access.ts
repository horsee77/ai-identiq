import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { getSessionFromCookie } from "@/lib/auth/session";

export type SessionContext = {
  userId: string;
  email: string;
  name: string;
  tenantId: string;
  role: string;
  permissions: Set<string>;
  isMasterAdmin: boolean;
  memberships: {
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    roleCode: string;
  }[];
};

export async function getSessionContext(): Promise<SessionContext | null> {
  const session = await getSessionFromCookie();
  if (!session) {
    return null;
  }

  const membershipCookie = (await cookies()).get(env.TENANT_COOKIE_NAME)?.value;
  const activeMembership =
    session.user.memberships.find((membership) => membership.tenantId === membershipCookie) ??
    session.user.memberships.find((membership) => membership.isDefault) ??
    session.user.memberships[0];

  if (!activeMembership) {
    return null;
  }

  const permissions = new Set(
    activeMembership.role.rolePermissions.map((entry) => entry.permission.key)
  );

  const memberships = session.user.memberships.map((membership) => ({
    tenantId: membership.tenantId,
    tenantName: membership.tenant.name,
    tenantSlug: membership.tenant.slug,
    roleCode: membership.role.code,
  }));

  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.fullName,
    tenantId: activeMembership.tenantId,
    role: activeMembership.role.code,
    permissions,
    isMasterAdmin: activeMembership.role.code === "MASTER_ADMIN",
    memberships,
  };
}

export async function requireSession(): Promise<SessionContext> {
  const context = await getSessionContext();
  if (!context) {
    redirect("/entrar");
  }
  return context;
}

export async function setActiveTenant(tenantId: string) {
  (await cookies()).set(env.TENANT_COOKIE_NAME, tenantId, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export function hasPermission(context: SessionContext, key: string) {
  return context.isMasterAdmin || context.permissions.has(key);
}

export async function requirePermission(key: string) {
  const context = await requireSession();
  if (!hasPermission(context, key)) {
    redirect("/plataforma/dashboard?erro=sem-permissao");
  }
  return context;
}
