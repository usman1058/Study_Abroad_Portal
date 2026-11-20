import { redirect } from "next/navigation";

/** The catalogue lives at /programs; keep the historical route as a redirect. */
export default function ScholarshipsPage() {
  redirect("/programs");
}
