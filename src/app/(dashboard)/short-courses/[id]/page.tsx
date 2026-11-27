import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getShortCourse } from "@/lib/queries";
import { EnrollButton } from "@/components/enroll-button";
import { UploadReceipt } from "@/components/upload-receipt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, FileText, MessageCircle } from "lucide-react";
import { formatDate, humanize, toNum } from "@/lib/utils";
import { FeeDisplay } from "@/components/currency";
import { AddCourseToCalendar } from "@/components/add-course-to-calendar";
import Link from "next/link";
import { ShortCourseStudio, type ShortCourseMaterialInfo, type ShortCourseSessionInfo } from "@/components/short-course-studio";
import { formatInTimeZone } from "@/lib/time-zones";

export const metadata = { title: "Course details" };

type PageProps = { params: Promise<{ id: string }> };

/** Absolute origin for share links, taken from the request instead of a build-time env var. */
async function requestOrigin(): Promise<string> {
  const store = await headers();
  const host = store.get("x-forwarded-host") ?? store.get("host") ?? "localhost:3000";
  const proto = store.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function ShortCourseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/");

  const course = await getShortCourse(id);
  if (!course) notFound();

  const isStaff = user.role !== "STUDENT";
  const canManageClassroom = user.role === "SUPER_ADMIN";
  const enrollment =
    user.role === "STUDENT"
      ? await prisma.shortCourseEnrollment.findUnique({
          where: { studentId_shortCourseId: { studentId: user.id, shortCourseId: id } },
          select: { id: true, status: true, receiptUrl: true },
        })
      : null;

  const hasClassAccess = enrollment?.status === "enrolled" || enrollment?.status === "completed";
  const canViewPaymentDetails = user.role === "SUPER_ADMIN" || Boolean(
    enrollment && ["pending_payment", "pending_approval", "rejected", "enrolled", "completed"].includes(enrollment.status),
  );
  // Drafts are private; students with an existing enrollment retain access if a course is unpublished.
  if (course.status !== "active" && !canManageClassroom && !enrollment) notFound();

  const [sessionRows, materialRows, roster] = await Promise.all([
    prisma.shortCourseSession.findMany({ where: { shortCourseId: id }, orderBy: { startsAt: "asc" } }),
    canManageClassroom || hasClassAccess
      ? prisma.shortCourseMaterial.findMany({
          where: { shortCourseId: id, ...(canManageClassroom ? {} : { published: true }) },
          orderBy: [{ createdAt: "desc" }],
          select: { id: true, title: true, description: true, fileName: true, contentType: true, fileSize: true, published: true, createdAt: true },
        })
      : Promise.resolve([]),
    canManageClassroom
      ? prisma.shortCourseEnrollment.findMany({
          where: { shortCourseId: id },
          orderBy: { enrolledAt: "desc" },
          select: { id: true, status: true, enrolledAt: true, student: { select: { firstName: true, lastName: true, email: true } } },
        })
      : Promise.resolve([]),
  ]);
  const sessions: ShortCourseSessionInfo[] = sessionRows.map((session) => ({
    id: session.id,
    title: session.title,
    startsAt: session.startsAt.toISOString(),
    endsAt: session.endsAt.toISOString(),
    timeZone: session.timeZone,
    meetingLink: canManageClassroom || hasClassAccess ? session.meetingLink : null,
  }));
  const materials: ShortCourseMaterialInfo[] = materialRows.map((material) => ({
    ...material,
    createdAt: material.createdAt.toISOString(),
  }));
  const isPendingPayment = enrollment?.status === "pending_payment";
  const isPendingApproval = enrollment?.status === "pending_approval";
  const isRejected = enrollment?.status === "rejected";
  const isPaid = course.paymentType === "PAID";

  const nextStart = course.startDates
    .map((d) => new Date(d))
    .filter((d) => d.getTime() > Date.now())
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const shareUrl = `${await requestOrigin()}/short-courses/${course.id}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                {course.provider?.[0] ?? "?"}
              </span>
              <div className="min-w-0">
                <p className="text-sm text-ink-muted">{course.provider}</p>
                <h1 className="text-2xl font-bold">{course.title}</h1>
                <p className="text-sm text-ink-muted">
                  {humanize(course.category)} · {course.duration}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canManageClassroom && <Link href={`/short-courses/${course.id}/edit`} className="inline-flex min-h-9 items-center rounded-lg border border-line-strong px-3 text-sm font-semibold hover:bg-canvas-subtle dark:border-navy-700 dark:hover:bg-navy-800">Edit course</Link>}
              <a
                href={`/api/short-courses/${course.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                <Download className="h-4 w-4" aria-hidden="true" /> Download details PDF
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Check out ${course.title} by ${course.provider} — ${shareUrl}`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Badge tone="brand">{humanize(course.category)}</Badge>
        <Badge tone={course.paymentType === "FREE" ? "green" : isPaid ? "amber" : "slate"}>
          {humanize(course.paymentType)}
        </Badge>
        {isStaff && <Badge tone="slate">{humanize(course.status)}</Badge>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {course.description && (
            <div>
              <p className="text-sm text-ink-muted">Description</p>
              <p className="mt-1 text-sm">{course.description}</p>
            </div>
          )}
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-ink-muted">Provider</dt>
              <dd className="mt-0.5 text-sm font-medium">{course.provider}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Category</dt>
              <dd className="mt-0.5 text-sm font-medium">{humanize(course.category)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Duration</dt>
              <dd className="mt-0.5 text-sm font-medium">{course.duration}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Delivery mode</dt>
              <dd className="mt-0.5 text-sm font-medium capitalize">{course.deliveryMode}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Class schedule</dt>
              <dd className="mt-0.5 text-sm font-medium">{course.classSchedule || "To be confirmed"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Next start</dt>
              <dd className="mt-0.5 text-sm font-medium">{nextStart ? formatDate(nextStart) : "To be confirmed"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Fee</dt>
              <dd className="mt-0.5 text-sm font-medium">
                {isPaid ? <FeeDisplay amount={toNum(course.fee)} /> : "Free — no payment is required"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Payment</dt>
              <dd className="mt-0.5 text-sm font-medium">
                {isPaid ? "Bank transfer, receipt reviewed by staff" : "No payment"}
              </dd>
            </div>
            {isPaid && canViewPaymentDetails && course.bankDetails && (
              <div className="col-span-2">
                <dt className="text-xs text-ink-muted">Bank details</dt>
                <dd className="mt-1 whitespace-pre-wrap rounded-lg bg-canvas p-3 text-sm dark:bg-navy-800">
                  {course.bankDetails}
                </dd>
                <p className="mt-1 text-xs text-ink-muted">
                  Transfer <FeeDisplay amount={toNum(course.fee)} /> and quote your full name as the reference.
                </p>
              </div>
            )}
            {course.meetingLink && (user.role === "SUPER_ADMIN" || hasClassAccess) && (
              <div>
                <dt className="text-xs text-ink-muted">Meeting link</dt>
                <dd className="mt-0.5">
                  <a
                    href={course.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-6 items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
                  >
                    Join meeting <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </dd>
              </div>
            )}
            {course.prerequisites && (
              <div className="col-span-2">
                <dt className="text-xs text-ink-muted">Prerequisites</dt>
                <dd className="mt-1 text-sm">{course.prerequisites}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {user.role === "STUDENT" && (
        <Card>
          <CardHeader>
            <CardTitle>Enrolment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!enrollment && (
              <div className="space-y-3">
              <p className="text-sm text-ink-muted">
                  {isPaid
                    ? "Enrol first to see the payment instructions. Then transfer the course fee and upload your receipt for staff review."
                    : "This course is free. Enrol to receive the class schedule and meeting link."}
                </p>
                <EnrollButton
                  shortCourseId={course.id}
                  enrolled={false}
                  paymentType={isPaid ? "PAID" : "FREE"}
                  course={{
                    fee: toNum(course.fee),
                    deliveryMode: course.deliveryMode,
                    classSchedule: course.classSchedule,
                    meetingLink: null,
                    startDates: course.startDates,
                    duration: course.duration,
                  }}
                />
              </div>
            )}

            {isPendingPayment && (
              <div className="space-y-3 rounded-lg bg-amber-50 p-4 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                <p className="font-medium">Payment pending</p>
                <p className="text-sm">
                  Transfer <FeeDisplay amount={toNum(course.fee)} /> using the bank details above, then upload your
                  receipt. Staff will review it and unlock the class link.
                </p>
                <UploadReceipt shortCourseId={course.id} />
              </div>
            )}

            {isPendingApproval && (
              <div className="space-y-3 rounded-lg bg-amber-50 p-4 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                <p className="font-medium">Receipt under review</p>
                <p className="text-sm">
                  Staff will review your receipt and unlock the class link once it is approved.
                </p>
                <a
                  href={`/api/short-courses/${course.id}/receipt`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-8 items-center gap-1 text-sm font-medium underline"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" /> View the receipt you uploaded
                </a>
              </div>
            )}

            {isRejected && (
              <div className="space-y-3 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/30 dark:text-red-200">
                <p className="font-medium">Your receipt was rejected</p>
                <p className="text-sm">
                  Upload a new receipt for the same course. Your enrolment is kept, so you do not need to enrol again.
                </p>
                {enrollment?.receiptUrl && (
                  <a
                    href={`/api/short-courses/${course.id}/receipt`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-8 items-center gap-1 text-sm font-medium underline"
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" /> View the rejected receipt
                  </a>
                )}
                <UploadReceipt shortCourseId={course.id} />
              </div>
            )}

            {hasClassAccess && (
              <div className="space-y-4 rounded-lg bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                <p className="font-medium">
                  {enrollment?.status === "enrolled"
                    ? "You are enrolled in this course!"
                    : "You have completed this course."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {course.meetingLink && (
                    <a
                      href={course.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-8 items-center gap-1 text-sm font-medium text-brand-700 underline dark:text-brand-300"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" /> Join class
                    </a>
                  )}
                </div>
              </div>
            )}

            {enrollment?.status === "completed" && (
              <p className="text-sm text-ink-muted">
                This course is finished. Your certificate is handled by your counselor.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Class schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-ink-muted">
            {course.classSchedule || (sessions.length ? "All upcoming class times are shown below." : "Exact class dates and times will be posted here.")}
          </p>
          {sessions.length > 0 ? (
            <ol className="divide-y divide-line dark:divide-navy-700">
              {sessions.map((session) => (
                <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{session.title}</p>
                    <p className="text-sm text-ink-muted">
                      {formatInTimeZone(session.startsAt, session.timeZone)} – {formatInTimeZone(session.endsAt, session.timeZone)} ({session.timeZone})
                    </p>
                  </div>
                  {session.meetingLink && (canManageClassroom || hasClassAccess) ? (
                    <a href={session.meetingLink} target="_blank" rel="noreferrer" aria-label={`Join class: ${session.title} (opens in a new tab)`} className="inline-flex min-h-9 items-center gap-1 text-sm font-medium text-brand-700 underline dark:text-brand-300">
                      Join class <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  ) : <span className="text-xs text-ink-muted">Join link unlocks after enrollment confirmation</span>}
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded-lg border border-dashed border-line-strong p-4 text-sm text-ink-muted dark:border-navy-700">No dated sessions have been added yet.</p>
          )}
          {sessions.length > 0 && <AddCourseToCalendar title={course.title} provider={course.provider} sessions={sessions} />}
        </CardContent>
      </Card>

      {user.role === "STUDENT" && (
        <Card>
          <CardHeader><CardTitle>Study materials</CardTitle></CardHeader>
          <CardContent>
            {!hasClassAccess ? (
              <p className="rounded-lg bg-canvas p-4 text-sm text-ink-muted dark:bg-navy-800">
                Course materials unlock after your enrollment is confirmed. For paid courses, staff confirm access after reviewing your receipt.
              </p>
            ) : materials.length === 0 ? (
              <p className="text-sm text-ink-muted">Your instructor has not published study materials yet.</p>
            ) : (
              <ul className="divide-y divide-line dark:divide-navy-700">
                {materials.map((material) => (
                  <li key={material.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">{material.title}</p>
                      <p className="text-xs text-ink-muted">{material.fileName} · {Math.max(1, Math.round(material.fileSize / 1024))} KB</p>
                      {material.description && <p className="mt-1 text-sm text-ink-muted">{material.description}</p>}
                    </div>
                    <a href={`/api/short-courses/${course.id}/materials/${material.id}`} aria-label={`Download ${material.title}`} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-line-strong px-3 text-sm font-medium text-brand-700 hover:bg-brand-50 dark:border-navy-700 dark:text-brand-300 dark:hover:bg-brand-900/30">
                      <Download className="h-4 w-4" aria-hidden="true" /> Download
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {canManageClassroom && <ShortCourseStudio courseId={course.id} sessions={sessions} materials={materials} />}

      {canManageClassroom && (
        <Card>
          <CardHeader><CardTitle>Enrollment roster ({roster.length})</CardTitle></CardHeader>
          <CardContent>
            {roster.length === 0 ? <p className="py-3 text-sm text-ink-muted">Students appear here after they enroll.</p> : (
              <div className="overflow-x-auto rounded-lg border border-line dark:border-navy-700">
                <table className="w-full text-sm">
                  <caption className="sr-only">Students enrolled in {course.title}</caption>
                  <thead className="bg-canvas text-left text-xs uppercase text-ink-muted dark:bg-navy-800">
                    <tr><th scope="col" className="p-3">Student</th><th scope="col" className="p-3">Email</th><th scope="col" className="p-3">Status</th><th scope="col" className="p-3">Enrolled</th></tr>
                  </thead>
                  <tbody className="divide-y divide-line dark:divide-navy-700">
                    {roster.map((entry) => <tr key={entry.id}><td className="p-3 font-medium">{entry.student.firstName} {entry.student.lastName}</td><td className="p-3">{entry.student.email}</td><td className="p-3">{humanize(entry.status)}</td><td className="p-3">{formatDate(entry.enrolledAt)}</td></tr>)}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {course.linkedProgram && (
        <a
          href={`/programs/${course.linkedProgram.id}`}
          className="inline-flex min-h-8 items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" /> View linked program
        </a>
      )}
    </div>
  );
}
