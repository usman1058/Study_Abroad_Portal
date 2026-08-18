import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\u00e0-\u00ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function main() {
  const programs = await prisma.program.findMany({ include: { university: true } });
  const used = new Set<string>();
  for (const p of programs) {
    if (p.slug) {
      used.add(p.slug);
      continue;
    }
    const base = slugify(`${p.university.name}-${p.name}`);
    let slug = base || `program-${p.id}`;
    let n = 2;
    while (used.has(slug)) {
      slug = `${base || `program-${p.id}`}-${n}`;
      n += 1;
    }
    used.add(slug);
    await prisma.program.update({ where: { id: p.id }, data: { slug } });
    console.log(`  ${p.id} -> ${slug}`);
  }
  console.log(`Backfilled ${programs.length} program slug(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());