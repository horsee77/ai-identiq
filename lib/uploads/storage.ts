import "server-only";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const uploadsRoot = join(process.cwd(), "uploads");

export async function persistUpload(fileName: string, content: Buffer) {
  await mkdir(uploadsRoot, { recursive: true });
  const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const target = join(uploadsRoot, safeName);
  await writeFile(target, content);
  return target;
}
