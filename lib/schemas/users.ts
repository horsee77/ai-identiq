import { z } from "zod";

export const userCreateSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  roleId: z.string().cuid(),
  tenantId: z.string().cuid().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED", "PENDING"]).default("ACTIVE"),
});
