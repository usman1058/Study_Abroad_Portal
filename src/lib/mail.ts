import nodemailer from "nodemailer";

/** Transactional email prefers the configured CheckMyUni mailbox via SMTP.
 * Resend remains an optional HTTPS fallback. Email failures never block account
 * actions, and message bodies are never written to application logs.
 */

const APP_NAME = "CheckMyUni Portal";
const COMPANY_NAME = "CheckMyUni";
const WEBSITE_URL = (process.env.NEXT_PUBLIC_WEBSITE_URL ?? "https://checkmyuni.com").replace(/\/+$/, "");

function appUrl(): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  return base.replace(/\/+$/, "");
}

async function sendMail(to: string, subject: string, text: string, html: string): Promise<"sent" | "logged"> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpPort = Number.parseInt(process.env.SMTP_PORT ?? "465", 10);
  const smtpSecure = process.env.SMTP_SECURE === "true" || smtpPort === 465;
  const replyTo = process.env.MAIL_REPLY_TO;
  const from = process.env.MAIL_FROM || (smtpUser ? `CheckMyUni <${smtpUser}>` : "");

  if (smtpHost && smtpUser && smtpPassword && Number.isInteger(smtpPort) && smtpPort > 0) {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPassword },
      connectionTimeout: 12_000,
      greetingTimeout: 12_000,
      socketTimeout: 20_000,
    });
    try {
      await transporter.sendMail({ from, to, replyTo, subject, text, html });
      return "sent";
    } catch (error) {
      console.error("[mail] SMTP delivery failed", error instanceof Error ? error.name : "unknown error");
      return "logged";
    } finally {
      transporter.close();
    }
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || !from) {
    console.info("[mail] no email provider is configured; message was not sent");
    return "logged";
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, reply_to: replyTo, subject, text, html }),
    });
    if (!res.ok) {
      console.error(`[mail] HTTPS provider returned status ${res.status}`);
      return "logged";
    }
    return "sent";
  } catch (error) {
    console.error("[mail] HTTPS provider unreachable", error instanceof Error ? error.name : "unknown error");
    return "logged";
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character] ?? character);
}

function emailHtml({ heading, preheader, body, buttonLabel, buttonUrl }: { heading: string; preheader: string; body: string; buttonLabel?: string; buttonUrl?: string }): string {
  const logoUrl = `${WEBSITE_URL}/checkmyuni-full-logo.png`;
  const action = buttonLabel && buttonUrl
    ? `<p style="margin:28px 0 20px"><a href="${escapeHtml(buttonUrl)}" style="display:inline-block;padding:13px 22px;border-radius:10px;background:linear-gradient(110deg,#315ebd,#704cc8);color:#fff;text-decoration:none;font-weight:700">${escapeHtml(buttonLabel)}</a></p><p style="color:#62647b;font-size:13px;line-height:1.6">If the button does not open, copy this link:<br><a href="${escapeHtml(buttonUrl)}" style="color:#4a55ae;word-break:break-all">${escapeHtml(buttonUrl)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f5fb;font-family:Arial,Helvetica,sans-serif;color:#171a35"><span style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</span><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f5fb;padding:32px 12px"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #e3e4ef;border-radius:18px;overflow:hidden"><tr><td style="padding:20px 28px 14px"><a href="${WEBSITE_URL}" style="display:inline-block"><img src="${logoUrl}" width="176" alt="CheckMyUni" style="display:block;width:176px;max-width:100%;height:auto;border:0"></a></td></tr><tr><td style="padding:0 28px 16px;border-bottom:1px solid #e8e9f1"><a href="${WEBSITE_URL}/applications" style="margin-right:18px;color:#555671;text-decoration:none;font-size:12px;font-weight:600">Applications</a><a href="${WEBSITE_URL}/about" style="margin-right:18px;color:#555671;text-decoration:none;font-size:12px;font-weight:600">About CheckMyUni</a><a href="${WEBSITE_URL}/contact" style="color:#555671;text-decoration:none;font-size:12px;font-weight:600">Contact</a></td></tr><tr><td style="padding:26px 32px;background:linear-gradient(115deg,#20345f,#315ebd 55%,#704cc8);color:#fff"><p style="margin:0 0 7px;color:#dbe5ff;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">CHECKMYUNI · STUDY ABROAD SUPPORT</p><h1 style="margin:0;font-size:23px;line-height:1.25">${escapeHtml(heading)}</h1></td></tr><tr><td style="padding:30px 32px 34px;font-size:15px;line-height:1.7">${body}${action}</td></tr><tr><td style="padding:20px 32px;background:#f8f8fc;border-top:1px solid #e8e9f1;color:#62647b;font-size:12px;line-height:1.7"><strong style="color:#20203d">${COMPANY_NAME}</strong><br>Study abroad guidance, applications, and student support.<br><a href="${WEBSITE_URL}" style="color:#4a55ae">checkmyuni.com</a> · <a href="${appUrl()}" style="color:#4a55ae">Open your portal</a> · <a href="${WEBSITE_URL}/contact" style="color:#4a55ae">Contact our team</a><br>This is an automated account message. Reply to this email for help.</td></tr></table></td></tr></table></body></html>`;
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
    emailHtml({ heading: "Reset your password", preheader: "Choose a new password for your CheckMyUni account.", body: `<p>We received a request to reset your password.</p><p>This secure link expires in 30 minutes.</p>`, buttonLabel: "Reset password", buttonUrl: resetUrl }),
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
  const safeName = escapeHtml(name);
  const message = pending
    ? `<p>Thanks for applying for a <strong>${escapeHtml(roleLabel)}</strong> account with CheckMyUni. Our team is reviewing your details and will email you when a decision is made.</p><p>No action is needed from you right now.</p>`
    : `<p>Your <strong>${escapeHtml(roleLabel)}</strong> account with CheckMyUni is ready. You can sign in and start exploring programs.</p>`;
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
      `— ${COMPANY_NAME}`,
    ].join("\n"),
    emailHtml({ heading: pending ? "Partner request received" : "Welcome to CheckMyUni", preheader: pending ? "We received your partner account request." : "Your CheckMyUni account is ready.", body: `<p>Hi ${safeName},</p>${message}`, ...(!pending ? { buttonLabel: "Sign in to CheckMyUni", buttonUrl: `${appUrl()}/student/login` } : {}) }),
  );
}

/** Welcome message sent when staff approve an account. */
export async function sendOnboardingEmail(
  to: string,
  { name, roleLabel }: AccountEmailContext,
): Promise<"sent" | "logged"> {
  const signInUrl = `${appUrl()}${roleLabel === "student" ? "/student/login" : "/partner/login"}`;
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
      `Sign in: ${signInUrl}`,
      "",
      "If anything looks wrong, reply to this email and our team will help.",
      "",
      `— ${COMPANY_NAME}`,
    ].join("\n"),
    emailHtml({ heading: "Your account is approved", preheader: `Your ${roleLabel} account is approved.`, body: `<p>Hi ${escapeHtml(name)},</p><p>Welcome aboard! Your <strong>${escapeHtml(roleLabel)}</strong> account has been approved and is ready to use.</p><ol><li>Sign in with the email address this message was sent to.</li><li>Complete your profile so applications and documents are addressed correctly.</li><li>Browse programs and start building applications or shortlists.</li></ol><p>If anything looks wrong, reply to this email and our team will help.</p>`, buttonLabel: "Open your portal", buttonUrl: signInUrl }),
  );
}

/**
 * Credentials are emailed for staff-created accounts and role-based invites.
 * Existing signup passwords are never regenerated during account approval.
 */
export async function sendCredentialsEmail(
  to: string,
  { name, email, password, student = false, temporary = false }: { name: string; email: string; password: string; student?: boolean; temporary?: boolean },
): Promise<"sent" | "logged"> {
  const signInUrl = `${appUrl()}${student ? "/student/login" : "/partner/login"}`;
  const passwordLabel = temporary ? "Temporary password" : "Password set during account creation";
  return sendMail(
    to,
    `Your ${APP_NAME} sign-in details`,
    [
      `Hi ${name},`,
      "",
      "Your account is active. Use these details to sign in:",
      "",
      `Email: ${email}`,
      `${passwordLabel}: ${password}`,
      "",
      temporary
        ? "For your security, change this temporary password after your first sign-in from Settings → Change password."
        : "This is the password provided when the account was created; it has not been replaced.",
      "",
      `Sign in: ${signInUrl}`,
      "",
      `— ${COMPANY_NAME}`,
    ].join("\n"),
    emailHtml({ heading: temporary ? "Your temporary sign-in details" : "Your sign-in details", preheader: temporary ? "Your CheckMyUni account invitation and temporary sign-in details." : "Your CheckMyUni account sign-in details.", body: `<p>Hi ${escapeHtml(name)},</p><p>Your account is active. Use the details below to sign in:</p><table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;background:#f7f7fc;border:1px solid #e3e4ef;border-radius:10px"><tr><td style="padding:12px 14px;color:#62647b;width:35%">Email</td><td style="padding:12px 14px;font-weight:700;word-break:break-word">${escapeHtml(email)}</td></tr><tr><td style="padding:12px 14px;color:#62647b;border-top:1px solid #e3e4ef">${escapeHtml(passwordLabel)}</td><td style="padding:12px 14px;font-weight:700;word-break:break-word;border-top:1px solid #e3e4ef">${escapeHtml(password)}</td></tr></table><p>${temporary ? "Please change this temporary password after you sign in." : "This is the password provided when your account was created."}</p>`, buttonLabel: "Sign in to CheckMyUni", buttonUrl: signInUrl }),
  );
}

export async function sendAccountInvitationEmail(to: string, { name, email, password, roleLabel, inviteUrl, student = false }: { name: string; email: string; password: string; roleLabel: string; inviteUrl: string; student?: boolean }): Promise<"sent" | "logged"> {
  const signInUrl = `${appUrl()}${student ? "/student/login" : "/partner/login"}`;
  return sendMail(
    to,
    `Your ${COMPANY_NAME} ${roleLabel} account invitation`,
    [`Hi ${name},`, "", `A CheckMyUni team member created a ${roleLabel} account for you.`, "", `Email: ${email}`, `Temporary password: ${password}`, "", "You must change this temporary password at your first sign-in before continuing. After signing in, complete your profile so your consultant can prepare your applications accurately.", `Sign in: ${signInUrl}`, `Invitation details: ${inviteUrl}`, "", `— ${COMPANY_NAME}`].join("\n"),
    emailHtml({ heading: "Your account is ready", preheader: `Your ${roleLabel} account is ready. Change your temporary password at first sign-in.`, body: `<p>Hi ${escapeHtml(name)},</p><p>A CheckMyUni team member created a <strong>${escapeHtml(roleLabel)}</strong> account for you.</p><table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;background:#f7f7fc;border:1px solid #e3e4ef;border-radius:10px"><tr><td style="padding:12px 14px;color:#62647b;width:35%">Email</td><td style="padding:12px 14px;font-weight:700;word-break:break-word">${escapeHtml(email)}</td></tr><tr><td style="padding:12px 14px;color:#62647b;border-top:1px solid #e3e4ef">Temporary password</td><td style="padding:12px 14px;font-weight:700;word-break:break-word;border-top:1px solid #e3e4ef">${escapeHtml(password)}</td></tr></table><p><strong>You must change this temporary password at your first sign-in before continuing to the portal.</strong></p><p>After signing in, complete your profile so your consultant can prepare your applications accurately.</p><p><a href="${escapeHtml(inviteUrl)}" style="color:#4a55ae">View your invitation details</a></p>`, buttonLabel: "Sign in to CheckMyUni", buttonUrl: signInUrl }),
  );
}

export async function sendStaffNewStudentEmail(to: string, { studentName, studentEmail, studentId }: { studentName: string; studentEmail: string; studentId: string }): Promise<"sent" | "logged"> {
  const url = `${appUrl()}/users?q=${encodeURIComponent(studentId)}`;
  return sendMail(
    to,
    `New student account · ${studentName}`,
    [`A new student account has been created.`, `Student: ${studentName}`, `Email: ${studentEmail}`, `Student ID: ${studentId}`, `Open student record: ${url}`, `— ${COMPANY_NAME}`].join("\n"),
    emailHtml({ heading: "A new student has joined", preheader: `${studentName} created a CheckMyUni student account.`, body: `<p>A new student account has been created and is ready for support.</p><table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;background:#f7f7fc;border:1px solid #e3e4ef"><tr><td style="padding:11px 14px;color:#62647b">Student</td><td style="padding:11px 14px;font-weight:700">${escapeHtml(studentName)}</td></tr><tr><td style="padding:11px 14px;border-top:1px solid #e3e4ef;color:#62647b">Email</td><td style="padding:11px 14px;border-top:1px solid #e3e4ef">${escapeHtml(studentEmail)}</td></tr><tr><td style="padding:11px 14px;border-top:1px solid #e3e4ef;color:#62647b">Student ID</td><td style="padding:11px 14px;border-top:1px solid #e3e4ef;font-weight:700">${escapeHtml(studentId)}</td></tr></table><p>Review the student record and help them get started with their application.</p>`, buttonLabel: "Open student record", buttonUrl: url }),
  );
}

export async function sendStaffApplicationSubmittedEmail(to: string, { studentName, applicationId, programName, universityName }: { studentName: string; applicationId: string; programName: string; universityName: string }): Promise<"sent" | "logged"> {
  const url = `${appUrl()}/application/${encodeURIComponent(applicationId)}`;
  return sendMail(
    to,
    `Application submitted · ${studentName}`,
    [`${studentName} submitted an application for review.`, `University: ${universityName}`, `Program: ${programName}`, `Application ID: ${applicationId}`, `Open application: ${url}`, `— ${COMPANY_NAME}`].join("\n"),
    emailHtml({ heading: "A student application is ready for review", preheader: `${studentName} submitted ${programName}.`, body: `<p><strong>${escapeHtml(studentName)}</strong> submitted an application and it is waiting for review.</p><table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;background:#f7f7fc;border:1px solid #e3e4ef"><tr><td style="padding:11px 14px;color:#62647b">University</td><td style="padding:11px 14px;font-weight:700">${escapeHtml(universityName)}</td></tr><tr><td style="padding:11px 14px;border-top:1px solid #e3e4ef;color:#62647b">Program</td><td style="padding:11px 14px;border-top:1px solid #e3e4ef">${escapeHtml(programName)}</td></tr><tr><td style="padding:11px 14px;border-top:1px solid #e3e4ef;color:#62647b">Application ID</td><td style="padding:11px 14px;border-top:1px solid #e3e4ef">${escapeHtml(applicationId)}</td></tr></table><p>Open the application to check the submitted details and document status.</p>`, buttonLabel: "Review application", buttonUrl: url }),
  );
}

export async function sendStaffDocumentUploadedEmail(to: string, { studentName, documentType, documentId, programName }: { studentName: string; documentType: string; documentId: string; programName?: string }): Promise<"sent" | "logged"> {
  const url = `${appUrl()}/documents?docs=pending&document=${encodeURIComponent(documentId)}`;
  return sendMail(
    to,
    `Document submitted · ${studentName}`,
    [`${studentName} uploaded a document for review.`, `Document: ${documentType}`, ...(programName ? [`Application: ${programName}`] : []), `Open document review: ${url}`, `— ${COMPANY_NAME}`].join("\n"),
    emailHtml({ heading: "A student document needs review", preheader: `${studentName} uploaded ${documentType}.`, body: `<p><strong>${escapeHtml(studentName)}</strong> uploaded a new document. It is waiting for verification.</p><p><strong>Document:</strong> ${escapeHtml(documentType)}${programName ? `<br><strong>Application:</strong> ${escapeHtml(programName)}` : ""}</p><p>Review the file and approve it or give the student a clear reason for rejection.</p>`, buttonLabel: "Review document", buttonUrl: url }),
  );
}

export async function sendDocumentRejectedEmail(to: string, { studentName, documentType, reason, documentId, programName }: { studentName: string; documentType: string; reason: string; documentId: string; programName?: string }): Promise<"sent" | "logged"> {
  const url = `${appUrl()}/documents?docs=rejected&document=${encodeURIComponent(documentId)}`;
  return sendMail(
    to,
    `Action needed: ${documentType} was rejected`,
    [`Hi ${studentName},`, "", `Your ${documentType} document was rejected.`, `Reason: ${reason}`, ...(programName ? [`Application: ${programName}`] : []), "Please upload a corrected document from My Applications or Documents.", `Open rejected document: ${url}`, `— ${COMPANY_NAME}`].join("\n"),
    emailHtml({ heading: "A document needs to be replaced", preheader: `Your ${documentType} document was rejected.`, body: `<p>Hi ${escapeHtml(studentName)},</p><p>Your <strong>${escapeHtml(documentType)}</strong> document was rejected and needs to be uploaded again.</p>${programName ? `<p><strong>Application:</strong> ${escapeHtml(programName)}</p>` : ""}<div style="margin:18px 0;padding:14px 16px;border-left:4px solid #c2415d;border-radius:6px;background:#fff3f4"><strong>Reason for rejection</strong><br>${escapeHtml(reason)}</div><p>Open the rejected document, review the reason, and upload a corrected file. The replacement will be sent back for review.</p>`, buttonLabel: "Review and replace document", buttonUrl: url }),
  );
}

export async function sendApplicationStatusEmail(to: string, { studentName, applicationId, programName, universityName, statusLabel }: { studentName: string; applicationId: string; programName: string; universityName: string; statusLabel: string }): Promise<"sent" | "logged"> {
  const rejected = statusLabel.toLowerCase() === "rejected";
  const url = `${appUrl()}/my-applications#application-${encodeURIComponent(applicationId)}`;
  return sendMail(
    to,
    `${rejected ? "Application decision" : "Application update"} · ${programName}`,
    [`Hi ${studentName},`, "", `Your application for ${programName} at ${universityName} is now ${statusLabel.toLowerCase()}.`, ...(rejected ? ["Please open the application to review the decision and contact your counselor or admin if you need help with next steps."] : []), `Application ID: ${applicationId}`, `View application: ${url}`, `— ${COMPANY_NAME}`].join("\n"),
    emailHtml({ heading: rejected ? "Your application was rejected" : "Your application has been updated", preheader: `${programName} at ${universityName}: ${statusLabel}.`, body: `<p>Hi ${escapeHtml(studentName)},</p><p>Your application for <strong>${escapeHtml(programName)}</strong> at <strong>${escapeHtml(universityName)}</strong> is now <strong>${escapeHtml(statusLabel.toLowerCase())}</strong>.</p>${rejected ? "<p>Open your application to review its status and contact your counselor or admin for guidance about next steps.</p>" : "<p>Open your application to see the latest status and continue your study-abroad journey.</p>"}<p style="font-size:13px;color:#62647b">Application ID: <strong>${escapeHtml(applicationId)}</strong></p>`, buttonLabel: "View my application", buttonUrl: url }),
  );
}
