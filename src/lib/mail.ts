/**
 * Minimal transactional email. Uses Resend when RESEND_API_KEY + MAIL_FROM are
 * configured; otherwise the message is written to the server log so the flow
 * stays usable in local development without a mail provider.
 *
 * Every helper resolves instead of throwing: a mail outage must never fail the
 * account action that triggered the message.
 */

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "StudyAbroad Portal";

function appUrl(): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  return base.replace(/\/+$/, "");
}

async function sendMail(to: string, subject: string, text: string): Promise<"sent" | "logged"> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    console.info(`[mail] ${to} | ${subject}\n${text}`);
    return "logged";
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!res.ok) {
      console.error(`[mail] provider error ${res.status}: ${await res.text().catch(() => "")}`);
      return "logged";
    }
    return "sent";
  } catch (error) {
    console.error("[mail] provider unreachable", error);
    return "logged";
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<"sent" | "logged"> {
  return sendMail(
    to,
    `Reset your ${APP_NAME} password`,
    [
      "We received a request to reset your password.",
      "",
      `Reset it here (valid for 30 minutes): ${resetUrl}`,
      "",
      "If you did not ask for this, you can ignore this email.",
    ].join("\n"),
  );
}

type AccountEmailContext = {
  name: string;
  /** Human-readable role, e.g. "student" or "partner agency". */
  roleLabel: string;
};

/**
 * Sent immediately after a student or partner submits a signup form, so the
 * applicant knows the request was received.
 */
export async function sendSignupConfirmationEmail(
  to: string,
  { name, roleLabel, pending }: AccountEmailContext & { pending: boolean },
): Promise<"sent" | "logged"> {
  return sendMail(
    to,
    pending ? `We received your ${APP_NAME} partner request` : `Welcome to ${APP_NAME}`,
    [
      `Hi ${name},`,
      "",
      pending
        ? `Thanks for applying for a ${roleLabel} account with ${APP_NAME}. Our team is reviewing your details and you will hear from us once the account is approved.`
        : `Your ${roleLabel} account with ${APP_NAME} is ready. You can sign in now and start exploring programs.`,
      "",
      pending ? "No action is needed from you right now." : `Sign in: ${appUrl()}/student/login`,
      "",
      `If you did not create this account, reply to this email and we will remove it.`,
      "",
      `— ${APP_NAME}`,
    ].join("\n"),
  );
}

/** Welcome message sent when staff approve an account. */
export async function sendOnboardingEmail(
  to: string,
  { name, roleLabel }: AccountEmailContext,
): Promise<"sent" | "logged"> {
  return sendMail(
    to,
    `Your ${APP_NAME} account is approved`,
    [
      `Hi ${name},`,
      "",
      `Welcome aboard! Your ${roleLabel} account has been approved and is ready to use.`,
      "",
      "Here is how to get started:",
      "1. Sign in with the email address this message was sent to.",
      "2. Complete your profile so applications and documents are addressed correctly.",
      "3. Browse programs and start building applications or shortlists.",
      "",
      `Sign in: ${roleLabel === "student" ? `${appUrl()}/student/login` : `${appUrl()}/partner/login`}`,
      "",
      "If anything looks wrong, reply to this email and our team will help.",
      "",
      `— ${APP_NAME}`,
    ].join("\n"),
  );
}

/**
 * Separate credentials message. Approval issues a temporary password so the
 * applicant can sign in even if they no longer remember the one they chose.
 */
export async function sendCredentialsEmail(
  to: string,
  { name, email, password, student = false }: { name: string; email: string; password: string; student?: boolean },
): Promise<"sent" | "logged"> {
  return sendMail(
    to,
    `Your ${APP_NAME} sign-in details`,
    [
      `Hi ${name},`,
      "",
      "Your account is active. Use these details to sign in:",
      "",
      `Email: ${email}`,
      `Temporary password: ${password}`,
      "",
      "For your security, change this password after your first sign-in from Settings → Change password.",
      "",
      `Sign in: ${appUrl()}${student ? "/student/login" : "/partner/login"}`,
      "",
      `— ${APP_NAME}`,
    ].join("\n"),
  );
}
