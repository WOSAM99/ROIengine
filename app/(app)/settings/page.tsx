import { User } from "lucide-react";
import { requireCompany } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { MappingsList } from "@/components/settings/mappings-list";

export const metadata = {
  title: "Settings · ROI Dashboard",
};

export default async function SettingsPage() {
  const ctx = await requireCompany();
  const mappings = await db.columnMapping.findMany({
    where: { companyId: ctx.companyId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    select: { id: true, name: true, isDefault: true, mapping: true, createdAt: true },
    take: 20,
  });

  const mappingSummaries = mappings.map((m) => {
    const obj = (m.mapping as Record<string, string> | null) ?? {};
    return {
      id: m.id,
      name: m.name,
      isDefault: m.isDefault,
      fieldCount: Object.keys(obj).length,
      createdAt: m.createdAt,
    };
  });

  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Manage your account credentials and reusable column mappings."
      />

      <Card>
        <CardHeader>
          <div className="text-accent-700 flex items-center gap-2 text-[11px] font-semibold tracking-wider uppercase">
            <User className="size-3.5" />
            Account
          </div>
          <CardTitle>{ctx.user.email}</CardTitle>
          <CardDescription className="break-words">
            Your password is stored and hashed by Supabase. We never see it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Column mappings</CardTitle>
          <CardDescription>
            Saved mappings are reused automatically when you upload files that share the same
            headers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MappingsList mappings={mappingSummaries} />
        </CardContent>
      </Card>
    </section>
  );
}
