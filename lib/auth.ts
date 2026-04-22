import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export type AuthedUser = {
  id: string;
  email: string;
};

export async function getUser(): Promise<AuthedUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return null;
  return { id: user.id, email: user.email };
}

export async function requireUser(): Promise<AuthedUser> {
  const user = await getUser();
  if (!user) redirect("/signin");
  return user;
}

type CompanyContext = {
  user: AuthedUser;
  companyId: string;
  companyName: string;
  profileId: string;
};

export async function requireCompany(): Promise<CompanyContext> {
  const user = await requireUser();

  const profile = await db.profile.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email },
    update: { email: user.email },
  });

  const membership = await db.membership.findFirst({
    where: { profileId: profile.id },
    include: { company: true },
  });

  if (membership) {
    return {
      user,
      companyId: membership.company.id,
      companyName: membership.company.name,
      profileId: profile.id,
    };
  }

  const domain = user.email.split("@")[1] ?? "workspace";
  const company = await db.company.create({
    data: {
      name: domain,
      members: {
        create: { profileId: profile.id, role: "owner" },
      },
    },
  });

  logger.info("Auto-created company for new user", {
    profileId: profile.id,
    companyId: company.id,
  });

  return {
    user,
    companyId: company.id,
    companyName: company.name,
    profileId: profile.id,
  };
}
