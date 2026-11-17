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
  // Archived and draft courses stay visible to staff only.
  if (course.status !== "active" && !isStaff) notFound();

  const enrollment =
    user.role === "STUDENT"
      ? await prisma.shortCourseEnrollment.findUnique({
          where: { studentId_shortCourseId: { studentId: user.id, shortCourseId: id } },
          select: { id: true, status: true, receiptUrl: true },
        })
      : null;

  const hasClassAccess = enrollment?.status === "enrolled" || enrollment?.status === "completed";
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
            {isPaid && course.bankDetails && (
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
                    ? "Enrol first, transfer the fee using the bank details above, then upload your receipt for review."
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
                  {nextStart && (
                    <AddCourseToCalendar
                      title={course.title}
                      provider={course.provider}
                      startDate={nextStart.toISOString()}
                      duration={course.duration}
                    />
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

      {course.linkedProgram && (
        <a
          href={`/scholarships/${course.linkedProgram.slug ?? course.linkedProgram.id}`}
          className="inline-flex min-h-8 items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" /> View linked program
        </a>
      )}
    </div>
  );
}
