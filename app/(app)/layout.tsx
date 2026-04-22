import { requireCompany } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCompany();
  return (
    <AppShell companyName={ctx.companyName} userEmail={ctx.user.email}>
      {children}
    </AppShell>
  );
}
