import { prisma } from "@/lib/db";
import { BYTES_PER_MB, DEFAULT_MAX_UPLOAD_SIZE_MB, parseUploadSizeMB } from "@/lib/upload-limits";

export async function getMaxUploadSizeMB(): Promise<number> {
  const setting = await prisma.portalSetting.findUnique({
    where: { key: "maxUploadSizeMB" },
    select: { value: true },
  });
  return parseUploadSizeMB(setting?.value ?? DEFAULT_MAX_UPLOAD_SIZE_MB);
}

export async function getMaxUploadSizeBytes(): Promise<number> {
  return (await getMaxUploadSizeMB()) * BYTES_PER_MB;
}
