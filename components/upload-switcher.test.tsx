import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { UploadSwitcher } from "./upload-switcher";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams("uploadId=all"),
}));

const uploads = [
  { id: "u1", filename: "first.csv" },
  { id: "u2", filename: "second.csv" },
];

describe("UploadSwitcher trigger label (SSR / initial render)", () => {
  // The dropdown items live in a Radix Portal — they are NOT part of the static
  // (SSR) markup. So any label text present in the static HTML comes from the
  // trigger's <SelectValue> children — the exact thing that renders blank on
  // initial load when no children are passed.
  it("renders 'ALL' in the trigger when activeId is the all-value", () => {
    const html = renderToStaticMarkup(<UploadSwitcher uploads={uploads} activeId="all" />);
    expect(html).toContain("ALL");
    expect(html).not.toContain("first.csv");
  });

  it("renders the filename in the trigger when a specific upload is active", () => {
    const html = renderToStaticMarkup(<UploadSwitcher uploads={uploads} activeId="u2" />);
    expect(html).toContain("second.csv");
  });
});
