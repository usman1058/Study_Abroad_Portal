import { createHash, createHmac, randomUUID } from "node:crypto";
import { request as httpsRequest } from "node:https";
import { prisma } from "@/lib/db";

/**
 * Media storage.
 *
 * Preferred backend is S3-compatible object storage (Cloudflare R2 in production);
 * Postgres stores only a reference (`s3:<key>`), never the bytes. When the S3 credentials are absent
 * (a fresh preview deployment, for example) uploads fall back to the
 * `StoredFile` table and are referenced as `db:<id>`, so document uploads keep
 * working instead of failing with "File storage is not configured".
 *
 * Legacy rows created before this change still hold `data:` URLs;
 * `readStoredFile` keeps those readable so nothing breaks without a migration.
 *
 * The client talks the S3 REST API directly and signs requests with AWS
 * Signature Version 4, so the app needs no SDK dependency. Only the three
 * operations it uses are implemented: PutObject, GetObject, DeleteObject.
 */

const BUCKET = process.env.S3_BUCKET ?? "assets";
const REF_PREFIX = "s3:";
const DB_REF_PREFIX = "db:";
const REGION = process.env.AWS_REGION ?? "ap-southeast-1";
const SERVICE = "s3";

const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export class StorageError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "StorageError";
    this.status = status;
  }
}

export function storageConfigured(): boolean {
  return Boolean(
    process.env.AWS_ENDPOINT_URL_S3 &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY,
  );
}

function sha256Hex(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

/** Encode one path segment the way S3 expects (RFC 3986, no `+` for spaces). */
function encodeSegment(segment: string): string {
  return encodeURIComponent(segment).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function canonicalPath(key: string): string {
  return `/${BUCKET}/${key.split("/").map(encodeSegment).join("/")}`;
}

type SignedRequest = { url: string; headers: Record<string, string> };

function signedRequest(method: "GET" | "PUT" | "DELETE", key: string, body?: Uint8Array, contentType?: string): SignedRequest {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new StorageError("File storage is not configured on this server.", 503);
  }

  const base = new URL(endpoint);
  // Path-style addressing: <endpoint>/<bucket>/<key>.
  const path = `${base.pathname.replace(/\/+$/, "")}${canonicalPath(key)}`;
  const amzDate = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body ?? new Uint8Array());

  const headers: Record<string, string> = {
    host: base.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (contentType) headers["content-type"] = contentType;

  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((name) => `${name}:${headers[name].trim()}\n`)
    .join("");

  const canonicalRequest = [
    method,
    path,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), REGION), SERVICE), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  headers.authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { url: `${base.protocol}//${base.host}${path}`, headers };
}

type StorageResponse = { status: number; contentType: string; bytes: Uint8Array };

function send(
  method: "GET" | "PUT" | "DELETE",
  key: string,
  body?: Uint8Array,
  contentType?: string,
): Promise<StorageResponse> {
  return sendWithRetry(method, key, body, contentType);
}

async function sendWithRetry(
  method: "GET" | "PUT" | "DELETE",
  key: string,
  body?: Uint8Array,
  contentType?: string,
): Promise<StorageResponse> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await sendOnce(method, key, body, contentType, attempt === 2);
    } catch (error) {
      if (!(error instanceof StorageError) || error.status !== 502 || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    }
  }
  throw new StorageError("File storage is unavailable. Please try again.", 502);
}

function sendOnce(
  method: "GET" | "PUT" | "DELETE",
  key: string,
  body?: Uint8Array,
  contentType?: string,
  logFailure = true,
): Promise<StorageResponse> {
  const { url, headers } = signedRequest(method, key, body, contentType);
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      url,
      {
        method,
        headers: { ...headers, ...(body ? { "content-length": String(body.byteLength) } : {}) },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("error", reject);
        res.on("end", () => {
          const bytes = new Uint8Array(Buffer.concat(chunks));
          const status = res.statusCode ?? 500;
          if (status >= 200 && status < 300) {
            resolve({
              status,
              contentType: String(res.headers["content-type"] ?? "application/octet-stream"),
              bytes,
            });
            return;
          }
          const detail = Buffer.from(bytes).toString("utf8").slice(0, 300);
          if (logFailure) console.error(`[storage] ${method} ${key} failed: ${status} ${detail}`);
          if (status === 404) reject(new StorageError("The stored file could not be found.", 404));
          else if (status === 401 || status === 403) reject(new StorageError("File storage rejected the request.", 502));
          else reject(new StorageError("File storage is unavailable. Please try again.", 502));
        });
      },
    );
    req.on("error", (error) => {
      if (logFailure) console.error(`[storage] ${method} ${key} network error:`, error);
      reject(new StorageError("File storage is unavailable. Please try again.", 502));
    });
    req.setTimeout(15_000, () => req.destroy(new Error("File storage request timed out")));
    if (body) req.write(Buffer.from(body));
    req.end();
  });
}

/** A stable key that never contains user-supplied text, so it cannot escape its prefix. */
export function buildMediaKey(
  kind: "documents" | "partner-documents" | "receipts" | "dashboard-ads" | "course-materials",
  ownerId: string,
  mime: string,
): string {
  const extension = EXTENSIONS[mime] ?? "bin";
  // Ids are cuids but sanitize anyway: the key is used in an HTTP path.
  const safeOwner = ownerId.replace(/[^A-Za-z0-9_-]/g, "");
  return `${kind}/${safeOwner}/${randomUUID()}.${extension}`;
}

export async function putObject(key: string, body: Uint8Array, contentType: string): Promise<string> {
  if (!storageConfigured()) {
    // No object storage on this deployment: keep the bytes in Postgres so the
    // user's upload still succeeds.
    const stored = await prisma.storedFile.create({
      data: { key, contentType, size: body.byteLength, bytes: Buffer.from(body) },
      select: { id: true },
    });
    return `${DB_REF_PREFIX}${stored.id}`;
  }
  await send("PUT", key, body, contentType);
  return `${REF_PREFIX}${key}`;
}

export function isStorageRef(value: string | null | undefined): boolean {
  return Boolean(value && (value.startsWith(REF_PREFIX) || value.startsWith(DB_REF_PREFIX)));
}

export function keyFromRef(ref: string): string | null {
  return isStorageRef(ref) ? ref.slice(REF_PREFIX.length) : null;
}

export async function getObject(key: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  const result = await send("GET", key);
  return { bytes: result.bytes, contentType: result.contentType };
}

/** Best-effort cleanup; a failure must never fail the user's request. */
export async function deleteObject(ref: string | null | undefined): Promise<void> {
  if (!ref) return;
  if (ref.startsWith(DB_REF_PREFIX)) {
    try {
      await prisma.storedFile.delete({ where: { id: ref.slice(DB_REF_PREFIX.length) } });
    } catch (error) {
      console.error("[storage] delete failed:", error);
    }
    return;
  }
  const key = keyFromRef(ref);
  if (!key || !storageConfigured()) return;
  try {
    await send("DELETE", key);
  } catch (error) {
    console.error("[storage] delete failed:", error);
  }
}

/** Decode a legacy `data:` URL. */
export function parseDataUrl(value: string): { bytes: Uint8Array; contentType: string } | null {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(value);
  if (!match) return null;
  return {
    contentType: match[1],
    bytes: new Uint8Array(Buffer.from(match[2], "base64")),
  };
}

/**
 * Read any stored media reference: an S3 key, a database fallback row, or a
 * legacy data URL. Throws `StorageError` when the reference is none of those.
 */
export async function readStoredFile(ref: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  if (ref.startsWith(DB_REF_PREFIX)) {
    const stored = await prisma.storedFile.findUnique({
      where: { id: ref.slice(DB_REF_PREFIX.length) },
      select: { bytes: true, contentType: true },
    });
    if (!stored) throw new StorageError("The stored file could not be found.", 404);
    return { bytes: new Uint8Array(stored.bytes), contentType: stored.contentType };
  }

  const key = keyFromRef(ref);
  if (key) return getObject(key);

  const legacy = parseDataUrl(ref);
  if (legacy) return legacy;

  throw new StorageError("The stored file is not readable.", 422);
}
