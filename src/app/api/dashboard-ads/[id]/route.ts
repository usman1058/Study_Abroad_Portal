import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { fail, ok, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { dashboardAdPatchSchema } from "@/lib/validation";
import { storeImageUrl } from "@/lib/media";
import { deleteObject, readStoredFile, StorageError } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN") return fail("Only the portal owner can manage dashboard advertisements", 403);
    const parsed = dashboardAdPatchSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid advertisement", 422);
    if (Object.keys(parsed.data).length === 0) return fail("No changes supplied", 422);
    const before = await prisma.dashboardAdvertisement.findUnique({ where: { id }, select: { id: true, title: true, active: true, imageUrl: true } });
    if (!before) return fail("Advertisement not found", 404);
    const data = parsed.data;
    // An unchanged stored image is sent back as `s3:<key>`; any other stored
    // reference is refused so an admin cannot attach someone else's object.
    if (data.imageUrl?.startsWith("s3:")) {
      if (data.imageUrl !== before.imageUrl) return fail("Upload the image instead of referencing a stored file", 422);
      delete data.imageUrl;
    }
    try {
      data.imageUrl = await storeImageUrl(data.imageUrl, user.id);
    } catch (error) {
      if (error instanceof StorageError) return fail(error.message, error.status);
      throw error;
    }
    const updated = await prisma.dashboardAdvertisement.update({
      where: { id },
      data: {
        ...data,
        ...(data.startsAt !== undefined ? { startsAt: data.startsAt ? new Date(data.startsAt) : null } : {}),
        ...(data.endsAt !== undefined ? { endsAt: data.endsAt ? new Date(data.endsAt) : null } : {}),
      },
      select: { id: true, title: true, active: true, imageUrl: true },
    });
    if (before.imageUrl && before.imageUrl !== updated.imageUrl) await deleteObject(before.imageUrl);
    await logAudit({ actorId: user.id, action: "update", entityType: "DashboardAdvertisement", entityId: id, before, after: updated });
    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN") return fail("Only the portal owner can manage dashboard advertisements", 403);
    const ad = await prisma.dashboardAdvertisement.findUnique({ where: { id }, select: { id: true, title: true, imageUrl: true } });
    if (!ad) return fail("Advertisement not found", 404);
    await prisma.dashboardAdvertisement.delete({ where: { id } });
    await deleteObject(ad.imageUrl);
    await logAudit({ actorId: user.id, action: "delete", entityType: "DashboardAdvertisement", entityId: id, before: { id: ad.id, title: ad.title } });
    return ok({ id });
  } catch (e) {
    return serverError(e);
  }
}

/**
 * Advertisement image. Any signed-in user may view dashboard ads, so the image
 * endpoint is session-scoped rather than public. External URLs (the older
 * contract) are redirected; stored files are streamed from object storage.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error } = await requireUser();
    if (error) return error;

    const ad = await prisma.dashboardAdvertisement.findUnique({ where: { id }, select: { imageUrl: true } });
    if (!ad?.imageUrl) return new Response("Image not found", { status: 404 });
    if (!ad.imageUrl.startsWith("data:") && !ad.imageUrl.startsWith("s3:")) {
      return Response.redirect(ad.imageUrl, 302);
    }

    const file = await readStoredFile(ad.imageUrl);
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    if (e instanceof StorageError) return new Response(e.message, { status: e.status });
    return serverError(e);
  }
}
