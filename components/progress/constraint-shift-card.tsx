import { RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  message: string;
};

export function ConstraintShiftCard({ message }: Props) {
  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardContent className="flex items-start gap-3 py-4">
        <RefreshCw className="text-accent mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-accent-700 text-sm font-medium">{message}</p>
      </CardContent>
    </Card>
  );
}
