import { requireCompany } from "@/lib/auth";
import { UploadWizard } from "@/components/upload/upload-wizard";
import { PageHeader } from "@/components/page-header";

export const metadata = {
  title: "New upload · ROI Dashboard",
};

export default async function NewUploadPage() {
  await requireCompany();
  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow="Imports"
        title="New upload"
        description="Drop in a CSV or XLSX, confirm how your columns map, then import."
      />
      <UploadWizard />
    </section>
  );
}
