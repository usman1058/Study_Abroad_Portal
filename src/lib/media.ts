import { buildMediaKey, parseDataUrl, putObject, StorageError } from "@/lib/storage";
import { getMaxUploadSizeBytes } from "@/lib/upload-limit-server";
import { formatUploadSizeMB } from "@/lib/upload-limits";

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
  const maxBytes = await getMaxUploadSizeBytes();
  if (parsed.bytes.byteLength > maxBytes) {
    throw new StorageError(`Image is too large. Maximum size is ${formatUploadSizeMB(maxBytes / (1024 * 1024))}.`, 413);
  }
  return putObject(buildMediaKey("dashboard-ads", ownerId, parsed.contentType), parsed.bytes, parsed.contentType);
}
