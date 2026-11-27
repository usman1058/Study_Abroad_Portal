import Link from "next/link";
import { BookOpen, CalendarDays, GraduationCap, LayoutDashboard, Users, FileText } from "lucide-react";

const items = [
  { key: "overview", label: "Course overview", suffix: "", icon: LayoutDashboard },
  { key: "classroom", label: "Classroom", suffix: "/classroom", icon: GraduationCap },
  { key: "sessions", label: "Schedule", suffix: "/classroom/sessions", icon: CalendarDays },
  { key: "materials", label: "Materials", suffix: "/classroom/materials", icon: BookOpen },
  { key: "students", label: "Students", suffix: "/classroom/students", icon: Users, adminOnly: true },
] as const;

export function ShortCourseWorkspaceNav({ courseId, active, isAdmin }: { courseId: string; active: string; isAdmin: boolean }) {
  return (
    <nav aria-label="Short course sections" className="flex gap-2 overflow-x-auto rounded-2xl border border-line bg-white p-2 shadow-sm dark:border-navy-700 dark:bg-navy-900">
      {items.filter((item) => !("adminOnly" in item) || !item.adminOnly || isAdmin).map((item) => {
        const Icon = item.icon;
        const selected = active === item.key;
        return (
          <Link key={item.key} href={`/short-courses/${courseId}${item.suffix}`} aria-current={selected ? "page" : undefined}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${selected ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm" : "text-ink-muted hover:bg-canvas-subtle hover:text-ink dark:hover:bg-navy-800 dark:hover:text-white"}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />{item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function CourseSectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="rounded-3xl bg-gradient-to-br from-[#10254f] via-[#263c83] to-[#6546b8] px-5 py-7 text-white shadow-lg sm:px-8 sm:py-9">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-100">{eyebrow}</p>
    <h1 className="mt-2 max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-50 sm:text-base">{description}</p>
  </header>;
}

export function EmptyClassroom({ title, description }: { title: string; description: string }) {
  return <div className="rounded-2xl border border-dashed border-line-strong bg-white px-6 py-12 text-center dark:border-navy-700 dark:bg-navy-900">
    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200"><FileText className="h-5 w-5" aria-hidden="true" /></span>
    <h2 className="mt-4 text-lg font-bold">{title}</h2><p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-ink-muted">{description}</p>
  </div>;
}
