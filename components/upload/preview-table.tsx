import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PreviewTableProps = {
  headers: string[];
  rows: Record<string, unknown>[];
};

export function PreviewTable({ headers, rows }: PreviewTableProps) {
  return (
    <div className="border-border overflow-hidden rounded-md border">
      <div className="max-h-72 overflow-auto">
        <Table>
          <TableHeader className="bg-background sticky top-0">
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header} className="whitespace-nowrap">
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIdx) => (
              <TableRow key={`row-${rowIdx}`}>
                {headers.map((header) => (
                  <TableCell
                    key={`${rowIdx}-${header}`}
                    className="text-foreground/80 font-numeric text-xs whitespace-nowrap"
                  >
                    {formatCellValue(row[header])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}
