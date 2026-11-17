import { buildMediaKey, parseDataUrl, putObject, StorageError } from "@/lib/storage";

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

/**
 * Advertisement images arrive as either an http(s) URL or a `data:image/...`
 * URL from the browser. Uploaded data URLs go to object storage; external
 * URLs are kept untouched.
 */
export async function storeImageUrl(
  imageUrl: string | null | undefined,
  ownerId: string,
): Promise<string | null | undefined> {
  if (!imageUrl || !imageUrl.startsWith("data:")) return imageUrl;
  const parsed = parseDataUrl(imageUrl);
  if (!parsed || !ALLOWED_IMAGE_TYPES.has(parsed.contentType)) {
    throw new StorageError("Use a PNG, JPEG, WebP, or GIF image.", 422);
  }
  return putObject(buildMediaKey("dashboard-ads", ownerId, parsed.contentType), parsed.bytes, parsed.contentType);
}
