import "server-only";
import { prisma } from "@/lib/db/prisma";

export async function createPromptVersion(promptId: string, authorId: string, content: string, changelog?: string) {
  const latest = await prisma.promptVersion.findFirst({
    where: { promptId },
    orderBy: { version: "desc" },
  });

  const version = (latest?.version ?? 0) + 1;

  return prisma.promptVersion.create({
    data: {
      promptId,
      authorId,
      version,
      content,
      changelog,
      status: "DRAFT",
    },
  });
}

export async function publishPromptVersion(promptId: string, versionId: string) {
  await prisma.promptVersion.updateMany({
    where: { promptId, status: "PUBLISHED" },
    data: { status: "ARCHIVED" },
  });

  await prisma.promptVersion.update({
    where: { id: versionId },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  await prisma.prompt.update({
    where: { id: promptId },
    data: {
      activeVersionId: versionId,
      status: "PUBLISHED",
    },
  });
}
