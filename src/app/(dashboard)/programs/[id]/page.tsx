import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { getProgramBySlug } from "@/lib/queries";

type PageProps = { params: Promise<{ id: string }> };

/** Keep program URLs distinct while reusing the full, accessible detail view. */
export default async function ProgramDetailRoute({ params }: PageProps) {
  const user = await currentUser();
  if (!user) redirect("/");
  const { id } = await params;
  const program = await getProgramBySlug(id);
  if (!program) notFound();
  redirect(`/scholarships/${program.slug ?? program.id}`);
}
