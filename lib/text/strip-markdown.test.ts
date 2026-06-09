import { describe, expect, it } from "vitest";
import { stripInlineMarkdown } from "./strip-markdown";

describe("stripInlineMarkdown", () => {
  it("removes bold emphasis markers", () => {
    expect(stripInlineMarkdown("**Water mitigation** drags margin")).toBe(
      "Water mitigation drags margin",
    );
    expect(stripInlineMarkdown("__Cash collection__ lags")).toBe("Cash collection lags");
  });

  it("removes italic emphasis markers", () => {
    expect(stripInlineMarkdown("This is *important* today")).toBe("This is important today");
  });

  it("removes leading heading markers", () => {
    expect(stripInlineMarkdown("### Margin leak")).toBe("Margin leak");
    expect(stripInlineMarkdown("# Top insight")).toBe("Top insight");
  });

  it("removes leading bullet markers", () => {
    expect(stripInlineMarkdown("* Call the 31-60 bucket")).toBe("Call the 31-60 bucket");
    expect(stripInlineMarkdown("- Pull last 6 jobs")).toBe("Pull last 6 jobs");
    expect(stripInlineMarkdown("+ Standardize scope")).toBe("Standardize scope");
  });

  it("removes blockquote markers", () => {
    expect(stripInlineMarkdown("> A note")).toBe("A note");
  });

  it("removes inline code backticks", () => {
    expect(stripInlineMarkdown("Run `migrate deploy` first")).toBe("Run migrate deploy first");
  });

  it("keeps link text and drops the url", () => {
    expect(stripInlineMarkdown("See [the report](https://example.com)")).toBe("See the report");
  });

  it("handles multi-line content with mixed markdown", () => {
    const input = "### Summary\n**Water jobs** lose money.\n* Fix bids\n* Review scope";
    const expected = "Summary\nWater jobs lose money.\nFix bids\nReview scope";
    expect(stripInlineMarkdown(input)).toBe(expected);
  });

  it("sweeps unbalanced bold markers", () => {
    expect(stripInlineMarkdown("Margin **at risk")).toBe("Margin at risk");
  });

  it("leaves plain prose unchanged aside from trimming", () => {
    expect(stripInlineMarkdown("  Revenue is $128,400 this month.  ")).toBe(
      "Revenue is $128,400 this month.",
    );
  });

  it("returns empty string untouched", () => {
    expect(stripInlineMarkdown("")).toBe("");
  });

  it("does not mangle dollar amounts or hyphenated words", () => {
    expect(stripInlineMarkdown("AR over $30k in the 31-60 day bucket")).toBe(
      "AR over $30k in the 31-60 day bucket",
    );
  });
});
