import { PrismaClient, Prisma } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const company = await db.company.upsert({
    where: { id: "seed-company" },
    update: {},
    create: {
      id: "seed-company",
      name: "Demo Co.",
    },
  });

  const profile = await db.profile.upsert({
    where: { id: "seed-profile" },
    update: {},
    create: {
      id: "seed-profile",
      email: "demo@example.com",
      fullName: "Demo User",
    },
  });

  await db.membership.upsert({
    where: { profileId_companyId: { profileId: profile.id, companyId: company.id } },
    update: {},
    create: {
      profileId: profile.id,
      companyId: company.id,
      role: "owner",
    },
  });

  const existing = await db.upload.findFirst({
    where: { companyId: company.id, filename: "demo-jobs.xlsx" },
  });
  if (existing) {
    console.log("Seed upload already exists, skipping rows insert.");
    return;
  }

  const upload = await db.upload.create({
    data: {
      companyId: company.id,
      uploadedBy: profile.id,
      filename: "demo-jobs.xlsx",
      storagePath: "",
      rowCount: 6,
      status: "READY",
      targetMargin: new Prisma.Decimal(0.3),
      warnings: [],
    },
  });

  // Numbers calibrated to the V1_Messy_Test_Dataset.xlsx patterns.
  const jobs: Prisma.JobCreateManyInput[] = [
    mk(company.id, upload.id, {
      jobId: "R-1000",
      clientName: "Customer 0",
      projectType: "mold",
      status: "delayed",
      projectManager: "Sarah Delgado",
      invoiceAmount: 12107,
      jobCost: 12753,
      cashReceived: 6189,
      balanceDue: 9756,
      arBucket: "Current",
      finishDate: "2025-03-26",
    }),
    mk(company.id, upload.id, {
      jobId: "R-1001",
      clientName: "Customer 1",
      projectType: "recon",
      projectManager: "Mike Reynolds",
      invoiceAmount: 21069,
      jobCost: 15490,
      cashReceived: 13796,
      balanceDue: 7630,
      arBucket: "1-30",
      startDate: "2025-02-18",
      finishDate: "2025-08-12",
    }),
    mk(company.id, upload.id, {
      jobId: "R-1002",
      clientName: "Customer 2",
      projectType: "fire",
      status: "completed",
      projectManager: "John Carter",
      invoiceAmount: 11497,
      jobCost: 6198,
      cashReceived: 6665,
      balanceDue: 8324,
      arBucket: "31-60",
      startDate: "2025-12-08",
      finishDate: "2025-07-15",
    }),
    mk(company.id, upload.id, {
      jobId: "R-1003",
      clientName: "Customer 3",
      projectType: "water",
      projectManager: "Mike Reynolds",
      invoiceAmount: 9647,
      jobCost: 15960,
      cashReceived: 5512,
      balanceDue: 5631,
      startDate: "2025-02-23",
      finishDate: "2025-01-14",
    }),
    mk(company.id, upload.id, {
      jobId: "R-1004",
      clientName: "Customer 4",
      status: "active",
      projectManager: "Sarah Delgado",
      invoiceAmount: 20193,
      jobCost: 19613,
      cashReceived: 13254,
      balanceDue: 8355,
      startDate: "2025-04-18",
      finishDate: "2025-04-08",
    }),
    mk(company.id, upload.id, {
      jobId: "R-1005",
      clientName: "Customer 5",
      status: "waiting",
      projectManager: "John Carter",
      invoiceAmount: 8191,
      jobCost: 10524,
      cashReceived: 7159,
      balanceDue: 123,
      arBucket: "61-90",
      startDate: "2025-05-21",
      finishDate: "2025-09-21",
    }),
  ];

  await db.job.createMany({ data: jobs });
  console.log(`Seeded ${jobs.length} jobs under company ${company.id}.`);
}

type SeedJob = {
  jobId: string;
  clientName: string;
  projectType?: "water" | "mold" | "fire" | "recon" | "cleaning" | "other";
  status?:
    | "active"
    | "in_progress"
    | "on_hold"
    | "delayed"
    | "waiting"
    | "completed"
    | "cancelled"
    | "unknown";
  projectManager: string;
  invoiceAmount: number;
  jobCost: number;
  cashReceived: number;
  balanceDue: number;
  arBucket?: string;
  startDate?: string;
  finishDate?: string;
};

function mk(companyId: string, uploadId: string, j: SeedJob): Prisma.JobCreateManyInput {
  return {
    companyId,
    uploadId,
    jobId: j.jobId,
    clientName: j.clientName,
    projectType: j.projectType,
    status: j.status,
    projectManager: j.projectManager,
    invoiceAmount: new Prisma.Decimal(j.invoiceAmount),
    jobCost: new Prisma.Decimal(j.jobCost),
    cashReceived: new Prisma.Decimal(j.cashReceived),
    balanceDue: new Prisma.Decimal(j.balanceDue),
    arBucket: j.arBucket ?? null,
    startDate: j.startDate ? new Date(`${j.startDate}T00:00:00Z`) : null,
    finishDate: j.finishDate ? new Date(`${j.finishDate}T00:00:00Z`) : null,
    raw: {
      jobId: j.jobId,
      clientName: j.clientName,
      projectType: j.projectType,
      status: j.status,
      projectManager: j.projectManager,
      invoiceAmount: j.invoiceAmount,
      jobCost: j.jobCost,
    },
  };
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
