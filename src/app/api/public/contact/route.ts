import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { fail, serverError } from "@/lib/api";
import { requiredName, optionalText, emailField, phoneField } from "@/lib/validation";

const limitContact = rateLimit({ windowMs: 10 * 60 * 1000, maxRequests: 5, keyPrefix: "public-contact" });
const contactSchema = z.object({
  name: requiredName(120),
  email: emailField(),
  phone: phoneField(),
  courseOfInterest: optionalText(120),
  countryOfInterest: optionalText(120),
  notes: optionalText(1000),
  website: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const limited = await limitContact(req);
    if (limited) return limited;
    const parsed = contactSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the form fields", 422);
    const data = parsed.data;
    // Quietly accept, but do not store, bot submissions caught by the hidden honeypot.
    if (data.website?.trim()) return NextResponse.json({ success: true }, { status: 201 });

    const lead = await prisma.visitorLead.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        courseOfInterest: data.courseOfInterest ?? null,
        countryOfInterest: data.countryOfInterest ?? null,
        notes: data.notes ?? null,
        source: "public_website",
      },
      select: { id: true },
    });
    return NextResponse.json({ success: true, id: lead.id }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
