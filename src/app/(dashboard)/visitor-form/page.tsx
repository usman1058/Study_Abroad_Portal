import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { VisitorLeadForm } from "@/components/visitor-lead-form";
import { DeleteButton } from "@/components/delete-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { VisitorLeadStatus } from "@/generated/prisma/client";

export const metadata = { title: "Visitor Form" };

export default async function VisitorFormPage() {
  const user = await currentUser();
  if (!user || user.role === "STUDENT") redirect("/");

  const leads = await prisma.visitorLead.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Visitor Form</h1>
          <p className="text-sm text-slate-500">Capture and follow up on enquiries and visitors.</p>
        </div>
        <VisitorLeadForm />
      </div>

      <Card>
        <CardHeader><CardTitle>Leads</CardTitle></CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No visitor leads yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                    <th className="p-4">Name</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Interests</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Received</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {leads.map((l) => (
                    <tr key={l.id}>
                      <td className="p-4 font-medium">{l.name}</td>
                      <td className="p-4 text-slate-500">{l.phone}{l.email && <div className="text-xs">{l.email}</div>}</td>
                      <td className="p-4 text-slate-500">
                        {[l.courseOfInterest, l.countryOfInterest].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="p-4"><Badge tone={l.status === "NEW" ? "brand" : l.status === "CONVERTED" ? "green" : "slate"}>{l.status}</Badge></td>
                      <td className="p-4 text-slate-500">{formatDate(l.createdAt)}</td>
                      <td className="p-4 text-right">
                        <DeleteButton endpoint={`/api/visitor-form/${l.id}`} confirmText="Delete this lead?" label="Delete" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}