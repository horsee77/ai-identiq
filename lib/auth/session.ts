import "server-only";
import { cookies } from "next/headers";
import { addHours, isBefore } from "date-fns";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db/prisma";
import { hashToken, randomToken } from "@/lib/security/token";

const sessionCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function createSession(userId: string, ipAddress?: string, userAgent?: string) {
  const rawToken = randomToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = addHours(new Date(), env.SESSION_TTL_HOURS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      ipAddress,
      userAgent,
      expiresAt,
    },
  });

  (await cookies()).set(env.SESSION_COOKIE_NAME, rawToken, {
    ...sessionCookieOptions,
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const rawToken = store.get(env.SESSION_COOKIE_NAME)?.value;
  if (!rawToken) {
    return;
  }

  const tokenHash = hashToken(rawToken);
  await prisma.session.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  store.delete(env.SESSION_COOKIE_NAME);
}

export async function getSessionFromCookie() {
  const store = await cookies();
  const rawToken = store.get(env.SESSION_COOKIE_NAME)?.value;
  if (!rawToken) {
    return null;
  }

  const tokenHash = hashToken(rawToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          memberships: {
            where: { status: "ACTIVE" },
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
              tenant: true,
            },
          },
        },
      },
    },
  });

  if (!session || session.revokedAt || isBefore(session.expiresAt, new Date())) {
    return null;
  }

  if (session.user.status !== "ACTIVE") {
    return null;
  }

  return session;
}
