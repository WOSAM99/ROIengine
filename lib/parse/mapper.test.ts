import { describe, expect, it } from "vitest";
import { suggestMapping, unmappedHeaders, normalizeHeader } from "./mapper";

const V1_HEADERS = [
  "Job #",
  "Client Name",
  "Project Type",
  "PM",
  "Invoice Amount ($)",
  "Job Cost (incl labor/subs)",
  "Cash Received",
  "Balance Due",
  "Hours (Labor)",
  "Status",
  "A/R Aging Bucket",
  "Start Date",
  "Finish Date",
  "Random Notes Column",
];

describe("normalizeHeader", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalizeHeader("Invoice Amount ($)")).toBe("invoice amount");
    expect(normalizeHeader("A/R Aging Bucket")).toBe("a r aging bucket");
  });
});

describe("suggestMapping against the V1_Messy_Test_Dataset.xlsx headers", () => {
  const mapping = suggestMapping({ headers: V1_HEADERS });

  it("maps every canonical field from real headers", () => {
    expect(mapping.jobId).toBe("Job #");
    expect(mapping.clientName).toBe("Client Name");
    expect(mapping.projectType).toBe("Project Type");
    expect(mapping.projectManager).toBe("PM");
    expect(mapping.invoiceAmount).toBe("Invoice Amount ($)");
    expect(mapping.jobCost).toBe("Job Cost (incl labor/subs)");
    expect(mapping.cashReceived).toBe("Cash Received");
    expect(mapping.balanceDue).toBe("Balance Due");
    expect(mapping.laborHours).toBe("Hours (Labor)");
    expect(mapping.status).toBe("Status");
    expect(mapping.arBucket).toBe("A/R Aging Bucket");
    expect(mapping.startDate).toBe("Start Date");
    expect(mapping.finishDate).toBe("Finish Date");
  });

  it("leaves Random Notes Column unmapped", () => {
    expect(unmappedHeaders(V1_HEADERS, mapping)).toEqual(["Random Notes Column"]);
  });

  it("prefers saved mapping over fuzzy suggestions when header still exists", () => {
    const saved = { jobId: "Client Name" } as const;
    const result = suggestMapping({ headers: V1_HEADERS, savedMapping: saved });
    expect(result.jobId).toBe("Client Name");
  });
});
