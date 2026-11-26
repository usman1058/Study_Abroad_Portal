import { prisma } from "@/lib/db";

// Only the public contact number is exposed; payment and account settings stay private.
export async function GET() {
  try {
    const setting = await prisma.portalSetting.findUnique({ where: { key: "whatsappNumber" }, select: { value: true } });
    const whatsappNumber = (setting?.value ?? "").replace(/\D/g, "");
    return Response.json({ whatsappNumber: /^\d{7,15}$/.test(whatsappNumber) ? whatsappNumber : "" }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return Response.json({ whatsappNumber: "" }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
