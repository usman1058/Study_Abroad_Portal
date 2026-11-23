import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { fail, ok, requireUser, serverError } from "@/lib/api";

const empty = { bankName: "", accountName: "", accountNumber: "", iban: "", bankInstructions: "", whatsappNumber: "" };

export async function GET() {
  try {
    const { error } = await requireUser();
    if (error) return error;
    const rows = await prisma.portalSetting.findMany({ where: { key: { in: ["paymentDetails", "whatsappNumber"] } } });
    const payment = rows.find((row) => row.key === "paymentDetails");
    let details = empty;
    if (payment) {
      try { details = { ...empty, ...JSON.parse(payment.value) }; } catch { details = empty; }
    }
    details.whatsappNumber = rows.find((row) => row.key === "whatsappNumber")?.value ?? "";
    return ok(details);
  } catch (error) { return serverError(error); }
}

export async function PUT(request: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN") return fail("Only an administrator can update portal settings", 403);
    const body = await request.json();
    const allowed = ["bankName", "accountName", "accountNumber", "iban", "bankInstructions", "whatsappNumber"] as const;
    if (!body || typeof body !== "object" || allowed.some((key) => typeof body[key] !== "string" || body[key].length > 500)) return fail("Settings contain invalid or overly long values", 422);
    const payment = Object.fromEntries(allowed.filter((key) => key !== "whatsappNumber").map((key) => [key, body[key].trim()]));
    const whatsapp = body.whatsappNumber.trim().replace(/[\s()+-]/g, "");
    if (whatsapp && !/^\d{7,15}$/.test(whatsapp)) return fail("Enter a WhatsApp number with country code, using digits only", 422);
    await prisma.$transaction([
      prisma.portalSetting.upsert({ where: { key: "paymentDetails" }, create: { key: "paymentDetails", value: JSON.stringify(payment) }, update: { value: JSON.stringify(payment) } }),
      prisma.portalSetting.upsert({ where: { key: "whatsappNumber" }, create: { key: "whatsappNumber", value: whatsapp }, update: { value: whatsapp } }),
    ]);
    return ok({ ...payment, whatsappNumber: whatsapp });
  } catch (error) { return serverError(error); }
}
