import { prisma } from "@/lib/db";

export function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .replace(/[^a-z0-9\u00e0-\u00ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return s || "program";
}

export async function makeProgramSlug(universityName: string, programName: string): Promise<string> {
  const base = slugify(`${universityName}-${programName}`);
  let slug = base;
  let n = 2;
  while (await prisma.program.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}