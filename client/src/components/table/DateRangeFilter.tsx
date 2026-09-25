import type { DateRange } from "react-day-picker";
import { CalendarDays, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateRangeFilterProps {
  value: DateRange | undefined;
  onChange: (value: DateRange | undefined) => void;
  label?: string;
}

const formatDate = (date?: Date) => date?.toLocaleDateString("tr-TR") || "";

export function DateRangeFilter({ value, onChange, label = "Tarih aralığı" }: DateRangeFilterProps) {
  const active = Boolean(value?.from || value?.to);
  const summary = value?.from
    ? `${formatDate(value.from)} — ${value.to ? formatDate(value.to) : "Bugün"}`
    : label;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className={cn("justify-start gap-2", active && "border-primary text-primary")}>
          <CalendarDays className="h-4 w-4" />
          <span>{summary}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs text-muted-foreground">
            Başlangıç seçip bitiş seçmezseniz bugüne kadar olan kayıtlar gösterilir.
          </p>
        </div>
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          numberOfMonths={2}
          disabled={{ after: new Date() }}
          initialFocus
        />
        {active && (
          <div className="border-t p-2">
            <Button type="button" size="sm" variant="ghost" className="w-full" onClick={() => onChange(undefined)}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Tarihi temizle
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function isWithinDateRange(value: string | null | undefined, range: DateRange | undefined) {
  if (!range?.from && !range?.to) return true;
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const from = range.from ? new Date(range.from) : undefined;
  if (from) from.setHours(0, 0, 0, 0);
  const to = range.to ? new Date(range.to) : new Date();
  to.setHours(23, 59, 59, 999);

  return (!from || date >= from) && date <= to;
}
