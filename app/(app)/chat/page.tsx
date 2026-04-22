import { requireCompany } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChatConsole } from "@/components/chat/chat-console";
import { PageHeader } from "@/components/page-header";

export const metadata = {
  title: "Chat · ROI Dashboard",
};

export default async function ChatPage() {
  const ctx = await requireCompany();
  const readyCount = await db.upload.count({
    where: { companyId: ctx.companyId, status: "READY" },
  });

  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow="Intelligence"
        title="Chat"
        description={
          <>
            Pick a question. We run the numbers and let the AI narrate them.{" "}
            <span className="text-foreground/70">
              Aggregates only — your job-level data never leaves the server.
            </span>
          </>
        }
      />
      <ChatConsole hasUploads={readyCount > 0} />
    </section>
  );
}
