import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ApplicationWizard, type WizardEducation, type WizardPersonal } from "@/components/application-wizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Start an application" };

type SearchParams = Promise<{ draft?: string; edit?: string; programId?: string }>;

export default async function ApplyPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.role !== "STUDENT") redirect("/home");

  const { draft: draftParam = "", edit: editParam = "", programId: programParam = "" } = await searchParams;
  const applicationParam = editParam || draftParam;

  const [me, documents, drafts, selectedProgram] = await Promise.all([
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
    prisma.application.findMany({
      where: { studentId: user.id, stage: "DRAFT" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, program: { select: { name: true, university: { select: { name: true } } } } },
    }),
    programParam ? prisma.program.findUnique({ where: { id: programParam.slice(0, 64) }, select: { id: true, name: true, university: { select: { name: true } } } }) : Promise.resolve(null),
  ]);

  // Draft editing: only the owner's own DRAFT applications can be completed here.
  let draftId: string | undefined;
  let draftProgramId: string | undefined;
  let editExisting = false;
  if (applicationParam) {
    const draft = await prisma.application.findUnique({
      where: { id: applicationParam },
      select: { id: true, studentId: true, stage: true, programId: true },
    });
    if (draft && draft.studentId === user.id && (draft.stage === "DRAFT" || (editParam && ["SUBMITTED", "UNDER_REVIEW"].includes(draft.stage)))) {
      draftId = draft.id;
      draftProgramId = draft.programId;
      editExisting = Boolean(editParam && draft.stage !== "DRAFT");
    }
  }

  const personal: WizardPersonal = me ?? {};
  const education = Array.isArray(me?.educationHistory) ? (me!.educationHistory as unknown as WizardEducation[]) : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/my-applications" className="inline-flex min-h-6 items-center text-sm text-brand-600 hover:underline">← My applications</Link>
        <h1 className="mt-1 text-2xl font-bold">Start an application</h1>
        <p className="text-sm text-ink-muted">
          {editExisting
            ? "Change the program on this application. Saving sends it back for review."
            : draftId
            ? "Editing your saved draft — update any section, then submit it for review. Each step is saved when you continue."
            : "Four steps: your details, academics, documents, then choose a university. Each step is saved when you continue."}
        </p>
      </div>

      {draftId && !draftProgramId && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-ink-muted">
            This draft is missing its program link. Submit a new application below instead.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{editExisting ? "Edit application" : draftId ? "Complete draft application" : "New application"}</CardTitle>
        </CardHeader>
        <CardContent>
          <ApplicationWizard
            personal={personal}
            education={education}
            documents={documents.map((d) => ({ type: d.type, status: d.status }))}
            draftId={draftId}
            draftProgramId={draftProgramId}
            initialProgramId={selectedProgram?.id}
            initialProgramLabel={selectedProgram ? `${selectedProgram.university.name} — ${selectedProgram.name}` : undefined}
            editExisting={editExisting}
            applications={drafts.map((draft) => ({
              id: draft.id,
              label: `${draft.program.university.name} — ${draft.program.name}`,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
