import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { listPrograms } from "@/lib/queries";
import { ApplicationWizard, type WizardEducation, type WizardPersonal } from "@/components/application-wizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Apply Application" };

type SearchParams = Promise<{ draft?: string }>;

export default async function ApplyPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.role !== "STUDENT") redirect("/home");

  const { draft: draftParam = "" } = await searchParams;

  const [programs, me, documents] = await Promise.all([
    listPrograms(),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        firstName: true, lastName: true, userTitle: true, gender: true, birthday: true,
        passportNumber: true, nationality: true, countryOfResidence: true, cityOfResidence: true,
        address: true, motherName: true, fatherName: true, educationHistory: true,
      },
    }),
    prisma.document.findMany({
      where: { ownerId: user.id },
      orderBy: { uploadedAt: "desc" },
      select: { type: true, status: true },
    }),
  ]);

  // Draft editing: only the owner's own DRAFT applications can be completed here.
  let draftId: string | undefined;
  let draftProgramId: string | undefined;
  if (draftParam) {
    const draft = await prisma.application.findUnique({
      where: { id: draftParam },
      select: { id: true, studentId: true, stage: true, programId: true },
    });
    if (draft && draft.studentId === user.id && draft.stage === "DRAFT") {
      draftId = draft.id;
      draftProgramId = draft.programId;
    }
  }

  const personal: WizardPersonal = me ?? {};
  const education = Array.isArray(me?.educationHistory) ? (me!.educationHistory as unknown as WizardEducation[]) : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/my-applications" className="text-sm text-brand-600 hover:underline">← My Applications</Link>
        <h1 className="mt-1 text-2xl font-bold">Apply Application</h1>
        <p className="text-sm text-slate-500">
          {draftId
            ? "Editing your saved draft — update any section, then submit it for review."
            : "Four quick steps: your details, academics, documents, then choose a university."}
        </p>
      </div>

      {draftId && !draftProgramId && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-slate-500">
            This draft is missing its program link. Submit a new application below instead.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{draftId ? "Complete draft application" : "New application"}</CardTitle>
        </CardHeader>
        <CardContent>
          <ApplicationWizard
            programs={programs.map((p) => ({ id: p.id, label: `${p.university?.name ?? ""} — ${p.name}` }))}
            personal={personal}
            education={education}
            documents={documents.map((d) => ({ type: d.type, status: d.status }))}
            draftId={draftId}
            draftProgramId={draftProgramId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
