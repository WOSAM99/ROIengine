import type { CanonicalField } from "./types";

export const SYNONYMS: Record<CanonicalField, readonly string[]> = {
  jobId: ["job id", "job #", "job number", "jobid", "job no", "job"],
  clientName: ["client name", "customer", "customer name", "client"],
  invoiceAmount: [
    "invoice amount",
    "invoice amount ($)",
    "invoice",
    "billed",
    "invoiced",
    "revenue",
  ],
  jobCost: ["job cost", "job cost (incl labor/subs)", "cost", "total cost"],
  cashReceived: ["cash received", "payments", "collected", "paid"],
  balanceDue: ["balance due", "outstanding", "ar", "a/r", "balance"],
  laborHours: ["hours (labor)", "labor hours", "hours", "man hours"],
  projectType: ["project type", "job type", "type", "service", "category"],
  projectManager: ["pm", "project manager", "manager", "supervisor"],
  status: ["status", "state", "job status"],
  arBucket: ["a/r aging bucket", "ar aging bucket", "aging", "ar bucket", "bucket"],
  startDate: ["start date", "started", "start"],
  finishDate: ["finish date", "completed", "end date", "closed", "completion date"],
};

export function canonicalLabel(field: CanonicalField): string {
  const labels: Record<CanonicalField, string> = {
    jobId: "Job ID",
    clientName: "Client Name",
    invoiceAmount: "Invoice Amount",
    jobCost: "Job Cost",
    cashReceived: "Cash Received",
    balanceDue: "Balance Due",
    laborHours: "Labor Hours",
    projectType: "Project Type",
    projectManager: "Project Manager",
    status: "Status",
    arBucket: "A/R Aging Bucket",
    startDate: "Start Date",
    finishDate: "Finish Date",
  };
  return labels[field];
}
