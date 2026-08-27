import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getShortCourse } from "@/lib/queries";
import { EnrollButton } from "@/components/enroll-button";
import { UploadReceipt } from "@/components/upload-receipt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, MessageCircle, Calendar, Clock } from "lucide-react";
import { formatDate, formatCurrency, toNum } from "@/lib/utils";
import { humanize } from "@/lib/utils";
import { FeeDisplay } from "@/components/currency";

export const metadata = { title: "Course Details" };

type PageProps = { params: Promise<{ id: string }> };

export default async function ShortCourseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/");

  const course = await getShortCourse(id);
  if (!course) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500">Course not found.</CardContent>
      </Card>
    );
  }

  const enrollment = (await prisma.shortCourseEnrollment.findUnique({
    where: { studentId_shortCourseId: { studentId: user.id, shortCourseId: id } },
    select: { id: true, status: true, receiptUrl: true },
  }));
  const isEnrolled = enrollment?.status === "enrolled";
  const isPendingPayment = enrollment?.status === "pending_payment";
  const isPendingApproval = enrollment?.status === "pending_approval";
  const isRejected = enrollment?.status === "rejected";

  const nextStart = course.startDates
    ? course.startDates
        .map((d) => new Date(d))
        .filter((d) => d.getTime() > Date.now())
        .sort((a, b) => a.getTime() - b.getTime())[0]
    : null;

  const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/short-courses/${id}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                {course.provider?.[0] ?? "?"}
              </span>
              <div>
                <p className="text-sm text-slate-500">{course.provider}</p>
                <h1 className="text-2xl font-bold">{course.title}</h1>
                <p className="text-sm text-slate-500">
                  {humanize(course.category)} · {course.duration}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/api/short-courses/${course.id}/pdf`}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                <Download className="h-4 w-4" /> Download Details PDF
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Check out ${course.title} by ${course.provider} — ${shareUrl}`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Badge tone="brand">{humanize(course.category)}</Badge>
        <Badge tone={course.paymentType === "FREE" ? "green" : course.paymentType === "PAID" ? "amber" : "slate"}>
          {course.paymentType}
        </Badge>
        <Badge tone="slate">{course.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {course.description && (
            <div>
              <p className="text-sm text-slate-500">Description</p>
              <p className="mt-1 text-sm">{course.description}</p>
            </div>
          )}
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-slate-500">Provider</dt>
              <dd className="mt-0.5 text-sm font-medium">{course.provider}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Category</dt>
              <dd className="mt-0.5 text-sm font-medium">{humanize(course.category)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Duration</dt>
              <dd className="mt-0.5 text-sm font-medium">{course.duration}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Delivery Mode</dt>
              <dd className="mt-0.5 text-sm font-medium capitalize">{course.deliveryMode}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Class Schedule</dt>
              <dd className="mt-0.5 text-sm font-medium">{course.classSchedule || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Next Start</dt>
              <dd className="mt-0.5 text-sm font-medium">{nextStart ? formatDate(nextStart) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Fee</dt>
              <dd className="mt-0.5 text-sm font-medium"><FeeDisplay amount={toNum(course.fee)} /></dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Payment Type</dt>
              <dd className="mt-0.5 text-sm font-medium">
                <Badge tone={course.paymentType === "FREE" ? "green" : course.paymentType === "PAID" ? "amber" : "slate"}>
                  {course.paymentType}
                </Badge>
              </dd>
            </div>
            {course.paymentType === "PAID" && course.bankDetails && (
              <div className="col-span-2">
                <dt className="text-xs text-slate-500">Bank Details</dt>
                <dd className="mt-1 text-sm whitespace-pre-wrap bg-slate-50 p-3 rounded-lg dark:bg-slate-800">{course.bankDetails}</dd>
              </div>
            )}
            {course.meetingLink && (
              <div>
                <dt className="text-xs text-slate-500">Meeting Link</dt>
                <dd className="mt-0.5">
                  <a href={course.meetingLink} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand-600 hover:underline inline-flex items-center gap-1">
                    Join Meeting <ExternalLink className="h-3 w-3" />
                  </a>
                </dd>
              </div>
            )}
            {course.prerequisites && (
              <div className="col-span-2">
                <dt className="text-xs text-slate-500">Prerequisites</dt>
                <dd className="mt-1 text-sm">{course.prerequisites}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Enrollment / Payment Section */}
      <Card>
        <CardHeader>
          <CardTitle>Enrollment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {course.paymentType === "FREE" && !isEnrolled && (
            <EnrollButton
              shortCourseId={course.id}
              enrolled={false}
              course={{ fee: toNum(course.fee), deliveryMode: course.deliveryMode, classSchedule: course.classSchedule, meetingLink: course.meetingLink, startDates: course.startDates, duration: course.duration }}
            />
          )}

          {course.paymentType === "PAID" && !isEnrolled && !isPendingPayment && !isPendingApproval && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">
                This is a paid course. Please complete the bank transfer using the details below, then upload your receipt.
              </p>
              {course.bankDetails && (
                <div className="bg-slate-50 p-4 rounded-lg dark:bg-slate-800/50">
                  <p className="font-medium mb-2">Bank Details</p>
                  <pre className="whitespace-pre-wrap text-sm bg-white p-3 rounded dark:bg-slate-800">{course.bankDetails}</pre>
                </div>
              )}
              <UploadReceipt
                shortCourseId={course.id}
                onUploaded={() => window.location.reload()}
              />
            </div>
          )}

          {isPendingPayment && (
            <div className="space-y-2 text-amber-700 bg-amber-50 p-4 rounded-lg dark:bg-amber-900/30">
              <p className="font-medium">Payment receipt uploaded. Waiting for admin approval.</p>
              <p className="text-sm">You will be notified once your receipt is reviewed.</p>
            </div>
          )}

          {isPendingApproval && (
            <div className="space-y-2 text-amber-700 bg-amber-50 p-4 rounded-lg dark:bg-amber-900/30">
              <p className="font-medium">Receipt under review.</p>
              <p className="text-sm">An admin will review your receipt shortly.</p>
            </div>
          )}

          {isEnrolled && (
            <div className="space-y-4 text-green-700 bg-green-50 p-4 rounded-lg dark:bg-green-900/30">
              <p className="font-medium">You are enrolled in this course!</p>
              <div className="flex flex-wrap gap-2">
                {course.meetingLink && (
                  <a href={course.meetingLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
                    <ExternalLink className="h-3 w-3" /> Join Class
                  </a>
                )}
                <button className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
                  <Calendar className="h-3 w-3" /> Add to Calendar
                </button>
              </div>
            </div>
          )}

          {isRejected && (
            <div className="space-y-2 text-red-700 bg-red-50 p-4 rounded-lg dark:bg-red-900/30">
              <p className="font-medium">Your receipt was rejected.</p>
              <p className="text-sm">Please upload a new receipt.</p>
              <UploadReceipt
                shortCourseId={course.id}
                onUploaded={() => window.location.reload()}
              />
            </div>
          )}

          {course.linkedProgram && (
            <a
              href={`/scholarships/${course.linkedProgram.slug ?? course.linkedProgram.id}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> View Linked Program
            </a>
          )}
        </CardContent>
      </Card>
    </div>
  );
}