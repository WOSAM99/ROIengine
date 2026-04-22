import { describe, expect, it } from "vitest";
import {
  deriveArBucket,
  mapProjectType,
  mapStatus,
  normalize,
  parseCurrency,
  parseDateLoose,
} from "./normalize";
import type { ColumnMapping, ParseResult } from "./types";

describe("parseCurrency", () => {
  it("strips $ and commas", () => {
    expect(parseCurrency("$12,107")?.toString()).toBe("12107");
    expect(parseCurrency("$21,069.50")?.toString()).toBe("21069.5");
    expect(parseCurrency("123")?.toString()).toBe("123");
  });

  it("returns null for empty or unparseable values", () => {
    expect(parseCurrency("")).toBeNull();
    expect(parseCurrency(null)).toBeNull();
    expect(parseCurrency(undefined)).toBeNull();
    expect(parseCurrency("abc")).toBeNull();
    expect(parseCurrency("$")).toBeNull();
  });

  it("handles accounting parentheses as negatives", () => {
    expect(parseCurrency("($500)")?.toString()).toBe("-500");
  });

  it("passes numbers through", () => {
    expect(parseCurrency(12345)?.toString()).toBe("12345");
  });
});

describe("parseDateLoose", () => {
  it("parses M/D/YY strings like the sample file", () => {
    expect(parseDateLoose("3/26/25").value).toBe("2025-03-26");
    expect(parseDateLoose("12/8/25").value).toBe("2025-12-08");
    expect(parseDateLoose("2/18/25").value).toBe("2025-02-18");
  });

  it("parses ISO strings", () => {
    expect(parseDateLoose("2025-03-26").value).toBe("2025-03-26");
  });

  it("returns null for empty/unparseable input", () => {
    expect(parseDateLoose("").value).toBeNull();
    expect(parseDateLoose(null).value).toBeNull();
    expect(parseDateLoose("not a date").value).toBeNull();
  });
});

describe("mapProjectType", () => {
  it("maps the sample file's values to the canonical enum", () => {
    expect(mapProjectType("Mold Remediation")).toBe("mold");
    expect(mapProjectType("Reconstruction")).toBe("recon");
    expect(mapProjectType("Fire/Smoke")).toBe("fire");
    expect(mapProjectType("Water Mitigation")).toBe("water");
  });
  it("maps cleaning variants", () => {
    expect(mapProjectType("Deep Cleaning")).toBe("cleaning");
  });
  it("falls back to other for unknown strings", () => {
    expect(mapProjectType("Roofing")).toBe("other");
  });
  it("returns null when input is null", () => {
    expect(mapProjectType(null)).toBeNull();
  });
});

describe("mapStatus", () => {
  it("maps sample file status variants", () => {
    expect(mapStatus("Active")).toBe("active");
    expect(mapStatus("Delayed")).toBe("delayed");
    expect(mapStatus("Completed")).toBe("completed");
    expect(mapStatus("Waiting on Sub")).toBe("waiting");
    expect(mapStatus("Waiting on insurance")).toBe("waiting");
  });
  it("maps common synonyms", () => {
    expect(mapStatus("On Hold")).toBe("on_hold");
    expect(mapStatus("Cancelled")).toBe("cancelled");
    expect(mapStatus("In Progress")).toBe("in_progress");
  });
  it("falls back to unknown", () => {
    expect(mapStatus("Weirdstring")).toBe("unknown");
  });
});

describe("deriveArBucket", () => {
  it("keeps canonical source values", () => {
    expect(deriveArBucket("Current", "0", null)).toBe("Current");
    expect(deriveArBucket("1-30", "100", null)).toBe("1-30");
    expect(deriveArBucket("31-60", "100", null)).toBe("31-60");
  });
  it("returns null when no balance and no source value", () => {
    expect(deriveArBucket(null, "0", null)).toBeNull();
  });
});

describe("normalize end-to-end on messy rows like the sample file", () => {
  const parsed: ParseResult = {
    headers: [
      "Job #",
      "Client Name",
      "Project Type",
      "PM",
      "Invoice Amount ($)",
      "Job Cost (incl labor/subs)",
      "Cash Received",
      "Balance Due",
      "Status",
      "A/R Aging Bucket",
      "Start Date",
      "Finish Date",
      "Random Notes Column",
    ],
    rows: [
      {
        "Job #": "R-1000",
        "Client Name": "Customer 0",
        "Project Type": "Mold Remediation",
        PM: "Sarah Delgado",
        "Invoice Amount ($)": "$12,107",
        "Job Cost (incl labor/subs)": "$12,753",
        "Cash Received": "$6,189",
        "Balance Due": "$9,756",
        Status: "Delayed",
        "A/R Aging Bucket": "Current",
        "Start Date": "",
        "Finish Date": "3/26/25",
        "Random Notes Column": "High margin job",
      },
      {
        // R-1003 in the real file has no Status
        "Job #": "R-1003",
        "Client Name": "Customer 3",
        "Project Type": "Water Mitigation",
        PM: "Mike Reynolds",
        "Invoice Amount ($)": "$9,647",
        "Job Cost (incl labor/subs)": "$15,960",
        "Cash Received": "$5,512",
        "Balance Due": "$5,631",
        Status: "",
        "A/R Aging Bucket": "",
        "Start Date": "2/23/25",
        "Finish Date": "1/14/25",
        "Random Notes Column": "",
      },
      {
        // Row missing required jobId — should be skipped
        "Job #": "",
        "Invoice Amount ($)": "$1",
        "Job Cost (incl labor/subs)": "$1",
      },
    ],
  };

  const mapping: ColumnMapping = {
    jobId: "Job #",
    clientName: "Client Name",
    projectType: "Project Type",
    projectManager: "PM",
    invoiceAmount: "Invoice Amount ($)",
    jobCost: "Job Cost (incl labor/subs)",
    cashReceived: "Cash Received",
    balanceDue: "Balance Due",
    status: "Status",
    arBucket: "A/R Aging Bucket",
    startDate: "Start Date",
    finishDate: "Finish Date",
  };

  const outcome = normalize({ parsed, mapping });

  it("imports every row with a jobId", () => {
    expect(outcome.jobs).toHaveLength(2);
    expect(outcome.jobs.map((j) => j.jobId)).toEqual(["R-1000", "R-1003"]);
  });

  it("normalizes currency to Decimal strings", () => {
    expect(outcome.jobs[0].invoiceAmount).toBe("12107");
    expect(outcome.jobs[0].jobCost).toBe("12753");
    expect(outcome.jobs[0].balanceDue).toBe("9756");
  });

  it("maps project type and status to enums", () => {
    expect(outcome.jobs[0].projectType).toBe("mold");
    expect(outcome.jobs[0].status).toBe("delayed");
    expect(outcome.jobs[1].projectType).toBe("water");
    expect(outcome.jobs[1].status).toBeNull();
  });

  it("parses dates to ISO", () => {
    expect(outcome.jobs[0].finishDate).toBe("2025-03-26");
    expect(outcome.jobs[1].startDate).toBe("2025-02-23");
    expect(outcome.jobs[1].finishDate).toBe("2025-01-14");
  });

  it("skips the row without a jobId and emits a warning", () => {
    expect(outcome.skippedCount).toBe(1);
    expect(
      outcome.warnings.some((w) => w.field === "jobId" && w.message.includes("missing job id")),
    ).toBe(true);
  });

  it("warns when status is missing but does not skip the row", () => {
    expect(
      outcome.warnings.some(
        (w) => w.jobId === "R-1003" && w.field === "status" && w.message.includes("missing"),
      ),
    ).toBe(true);
  });
});
