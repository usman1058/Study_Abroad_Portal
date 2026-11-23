import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const portalOrigin = process.env.PORTAL_API_BASE_URL || "http://localhost:3000";
  try {
    const payload = await request.json();
    const response = await fetch(`${portalOrigin.replace(/\/$/, "")}/api/public/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const body = await response.json().catch(() => ({ error: "The enquiry could not be submitted." }));
    return Response.json(body, { status: response.status });
  } catch {
    return Response.json({ success: false, error: "We couldn't reach the enquiry service. Please try again shortly." }, { status: 503 });
  }
}
