import { requireCompany } from "@/lib/auth";
import { db } from "@/lib/db";
import { UploadWizard } from "@/components/upload/upload-wizard";
import { PageHeader } from "@/components/page-header";

export const metadata = {
  title: "New upload · ROI Dashboard",
};

const DEFAULT_TARGET_MARGIN_FALLBACK = 0.3;

export default async function NewUploadPage() {
  const ctx = await requireCompany();

  // Company-wide default target margin. Added in migration 20260422140000.
  // Cast until generated Prisma client catches up.
  const company = (await db.company.findUnique({
    where: { id: ctx.companyId },
  })) as ({ defaultTargetMargin?: unknown } & { id: string }) | null;

  const defaultTargetMargin = parseDefaultTargetMargin(company?.defaultTargetMargin);

  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow="Imports"
        title="New upload"
        description="Drop in a CSV or XLSX, confirm how your columns map, then import."
      />
      <UploadWizard defaultTargetMargin={defaultTargetMargin} />
    </section>
  );
}

function parseDefaultTargetMargin(raw: unknown): number {
  if (raw === null || raw === undefined) return DEFAULT_TARGET_MARGIN_FALLBACK;
  // Prisma Decimal serializes as an object with a `.toString()` method in Node.
  const str = typeof raw === "string" ? raw : (raw as { toString(): string }).toString();
  const n = Number(str);
  if (!Number.isFinite(n) || n < 0 || n > 1) return DEFAULT_TARGET_MARGIN_FALLBACK;
  return n;
}
