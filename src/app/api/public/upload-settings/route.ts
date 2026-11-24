import { prisma } from "@/lib/db";
import { DEFAULT_MAX_UPLOAD_SIZE_MB, parseUploadSizeMB } from "@/lib/upload-limits";

export async function GET() {
  try {
    const setting = await prisma.portalSetting.findUnique({
      where: { key: "maxUploadSizeMB" },
      select: { value: true },
    });
    return Response.json({ maxUploadSizeMB: parseUploadSizeMB(setting?.value ?? DEFAULT_MAX_UPLOAD_SIZE_MB) }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ maxUploadSizeMB: DEFAULT_MAX_UPLOAD_SIZE_MB }, {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
