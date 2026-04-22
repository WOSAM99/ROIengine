import { User } from "lucide-react";
import { requireCompany } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { TargetMarginForm } from "@/components/settings/target-margin-form";

export const metadata = {
  title: "Settings · ROI Dashboard",
};

export default async function SettingsPage() {
  const ctx = await requireCompany();

  // Company default target margin. Field added in migration 20260422140000.
  // Cast until the generated Prisma client catches up.
  const company = (await db.company.findUnique({
    where: { id: ctx.companyId },
  })) as ({ defaultTargetMargin?: unknown } & { id: string }) | null;

  const currentDefaultTargetMargin = parseDefaultTargetMargin(company?.defaultTargetMargin);

  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Manage your account credentials and workspace defaults."
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
          <CardTitle>Workspace defaults</CardTitle>
          <CardDescription>
            Values applied to every new upload unless overridden at import time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TargetMarginForm initialTargetMargin={currentDefaultTargetMargin} />
        </CardContent>
      </Card>
    </section>
  );
}

function parseDefaultTargetMargin(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const str = typeof raw === "string" ? raw : (raw as { toString(): string }).toString();
  const n = Number(str);
  if (!Number.isFinite(n) || n < 0 || n > 1) return null;
  return n;
}
