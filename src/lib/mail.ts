/**
 * Minimal transactional email. Uses Resend when RESEND_API_KEY + MAIL_FROM are
 * configured; otherwise the message is written to the server log so the flow
 * stays usable in local development without a mail provider.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<"sent" | "logged"> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    console.info(`[password-reset] ${to} -> ${resetUrl}`);
    return "logged";
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: "Reset your StudyAbroad Portal password",
        text: [
          "We received a request to reset your password.",
          "",
          `Reset it here (valid for 30 minutes): ${resetUrl}`,
          "",
          "If you did not ask for this, you can ignore this email.",
        ].join("\n"),
      }),
    });
    if (!res.ok) {
      console.error(`[password-reset] provider error ${res.status}: ${await res.text().catch(() => "")}`);
      return "logged";
    }
    return "sent";
  } catch (error) {
    console.error("[password-reset] provider unreachable", error);
    return "logged";
  }
}
