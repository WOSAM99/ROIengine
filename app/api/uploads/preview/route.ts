import { NextResponse, type NextRequest } from "next/server";
import { requireCompany } from "@/lib/auth";
import { detectFormat, readFileBuffer, previewFromResult } from "@/lib/parse/read";
import { suggestMapping, unmappedHeaders } from "@/lib/parse/mapper";
import { validateFile } from "@/lib/parse/validate";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4MB

export async function POST(request: NextRequest) {
  await requireCompany();

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File is too large (${file.size} bytes). Max is ${MAX_UPLOAD_BYTES}.` },
      { status: 413 },
    );
  }

  const format = detectFormat(file.name, file.type);
  if (!format) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload a .csv or .xlsx file." },
      { status: 415 },
    );
  }

  const buffer = await file.arrayBuffer();
  const parsed = await readFileBuffer(buffer, format);

  const fileIssues = validateFile(parsed);
  if (fileIssues.length > 0) {
    return NextResponse.json({ error: fileIssues[0].message }, { status: 422 });
  }

  // Saved-mapping lookup removed 2026-04-22 along with the ColumnMapping table.
  // Auto-suggestion now relies entirely on the synonym dictionary in lib/parse/synonyms.ts.
  const suggested = suggestMapping({ headers: parsed.headers });
  const preview = previewFromResult(parsed, 5);

  return NextResponse.json({
    filename: file.name,
    format,
    totalRows: parsed.rows.length,
    headers: parsed.headers,
    preview: preview.rows,
    suggestedMapping: suggested,
    unmappedHeaders: unmappedHeaders(parsed.headers, suggested),
  });
}
