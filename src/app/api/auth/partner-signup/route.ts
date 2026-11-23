import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, serverError } from "@/lib/api";
import { signupRateLimit } from "@/lib/rate-limit";
import { notifyMany } from "@/lib/audit";
import { requiredName, emailField, phoneField, passwordField } from "@/lib/validation";
import { sendSignupConfirmationEmail } from "@/lib/mail";
import { detectMimeFromBase64, isAllowedMimeType } from "@/lib/utils";
import { buildMediaKey, deleteObject, parseDataUrl, putObject, StorageError } from "@/lib/storage";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 4 * 1024 * 1024;

const partnerSignupSchema = z.object({
  companyName: requiredName(160, "Company name is required"),
  licenseNumber: z.string().trim().min(3, "Business registration / licence number is required").max(60),
  firstName: requiredName(80),
  lastName: requiredName(80),
  email: emailField(),
  phone: phoneField(),
  country: z.string().trim().min(1, "Country is required").max(80),
  password: passwordField(),
});

export async function POST(req: NextRequest) {
  const rl = await signupRateLimit(req);
  if (rl) return rl;

  try {
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > 4_500_000) return fail("The combined document upload is too large (max 4 MB of files)", 413);

    const formData = await req.formData();
    const value = (name: string) => {
      const field = formData.get(name);
      return typeof field === "string" ? field : "";
    };
    const parsed = partnerSignupSchema.safeParse({
      companyName: value("companyName"),
      licenseNumber: value("licenseNumber"),
      firstName: value("firstName"),
      lastName: value("lastName"),
      phone: value("phone"),
      email: value("email"),
      country: value("country"),
      password: value("password"),
    });
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const { companyName, licenseNumber, firstName, lastName, email, phone, country, password } = parsed.data;
    const registrationFile = formData.get("businessRegistration");
    if (!(registrationFile instanceof File) || registrationFile.size === 0) {
      return fail("Upload your business registration document", 422);
    }
    const supportingEntries = formData.getAll("supportingDocuments");
    if (supportingEntries.some((entry) => !(entry instanceof File))) return fail("Invalid supporting document upload", 422);
    const supportingFiles = supportingEntries.filter((entry): entry is File => entry instanceof File && entry.size > 0);
    if (supportingFiles.length > 5) return fail("Upload no more than five additional documents", 422);
    const uploads = [
      { file: registrationFile, type: "BUSINESS_REGISTRATION" as const },
      ...supportingFiles.map((file) => ({ file, type: "OTHER" as const })),
    ];
    const decodedDocuments: { type: "BUSINESS_REGISTRATION" | "OTHER"; originalName: string; mime: string; bytes: Uint8Array }[] = [];
    let totalBytes = 0;
    for (const { file, type } of uploads) {
      if (!file.size || file.size > MAX_FILE_BYTES) return fail("Each document must be valid and 4 MB or smaller", 413);
      totalBytes += file.size;
      if (totalBytes > MAX_TOTAL_FILE_BYTES) return fail("The combined document size must be 4 MB or smaller", 413);

      const bytes = new Uint8Array(await file.arrayBuffer());
      const mime = detectMimeFromBase64(Buffer.from(bytes).toString("base64"));
      if (!mime || !isAllowedMimeType(mime)) {
        return fail("File type not allowed. Use PDF, JPEG, PNG, DOC or DOCX files", 415);
      }
      const originalName = file.name.replace(/\\/g, "/").split("/").pop()?.slice(0, 120) || "supporting-document";
      decodedDocuments.push({ type, originalName, mime, bytes });
    }
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return fail("An account with this email already exists", 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        role: "AGENCY",
        email: normalizedEmail,
        passwordHash,
        firstName,
        lastName,
        phone,
        country,
        companyName,
        licenseNumber,
        status: "pending",
      },
      select: { id: true, email: true },
    });

    const storedRefs: string[] = [];
    try {
      for (const document of decodedDocuments) {
        const fileUrl = await putObject(
          buildMediaKey("partner-documents", user.id, document.mime),
          document.bytes,
          document.mime,
        );
        storedRefs.push(fileUrl);
        await prisma.partnerDocument.create({
          data: {
            agencyId: user.id,
            type: document.type,
            originalName: document.originalName,
            fileUrl,
          },
        });
      }
    } catch (error) {
      await Promise.all(storedRefs.map((ref) => deleteObject(ref)));
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
      if (error instanceof StorageError) return fail(error.message, error.status);
      throw error;
    }

    const admins = await prisma.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "MANAGER"] } },
      select: { id: true },
    });
    if (admins.length > 0) {
      await notifyMany(
        admins.map((a) => ({ userId: a.id })),
        {
          type: "partner_request",
          title: "New partner signup request",
          body: `${companyName} (${normalizedEmail}) is awaiting approval.`,
          data: { userId: user.id, companyName },
        }
      );
    }

    await sendSignupConfirmationEmail(normalizedEmail, {
      name: `${firstName} ${lastName}`.trim(),
      roleLabel: "partner agency",
      pending: true,
    });

    return ok({ id: user.id, email: user.email, status: "pending" }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
