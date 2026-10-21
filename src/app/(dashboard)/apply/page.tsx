import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import ApplyClient from "./apply-client";

export const metadata = { title: "Apply Application · StudyAbroad Portal" };

type SearchParams = Promise<{ draft?: string }>;

export default async function ApplyPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.role !== "STUDENT") redirect("/home");

  const { draft } = await searchParams;
  return <ApplyClient draftId={draft} />;
}
