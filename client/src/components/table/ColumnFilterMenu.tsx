import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ColumnFilterOption {
  value: string;
  label: string;
}

interface ColumnFilterMenuProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: ColumnFilterOption[];
  placeholder?: string;
  sortDirection?: "asc" | "desc" | null;
  onSort?: (direction: "asc" | "desc") => void;
  className?: string;
}

export function ColumnFilterMenu({
  label,
  value,
  onChange,
  options,
  placeholder = "Filtre değeri...",
  sortDirection,
  onSort,
  className,
}: ColumnFilterMenuProps) {
  const active = Boolean(value);
  const [optionSearch, setOptionSearch] = useState("");
  const visibleOptions = useMemo(() => {
    if (!options) return [];
    const query = optionSearch.trim().toLocaleLowerCase("tr-TR");
    return query
      ? options.filter((option) => option.label.toLocaleLowerCase("tr-TR").includes(query))
      : options;
  }, [options, optionSearch]);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className={cn("whitespace-nowrap", active && "text-primary")}>{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`${label} kolonunu filtrele`}
            className={cn(
              "rounded p-0.5 transition-colors hover:bg-accent hover:text-foreground",
              active ? "bg-primary/10 text-primary" : "text-muted-foreground/60",
            )}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 space-y-3 p-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">Bu kolona göre filtrele</p>
          </div>

          {onSort && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant={sortDirection === "asc" ? "default" : "outline"}
                onClick={() => onSort("asc")}
              >
                <ChevronUp className="mr-1 h-3.5 w-3.5" /> Artan
              </Button>
              <Button
                type="button"
                size="sm"
                variant={sortDirection === "desc" ? "default" : "outline"}
                onClick={() => onSort("desc")}
              >
                <ChevronDown className="mr-1 h-3.5 w-3.5" /> Azalan
              </Button>
            </div>
          )}

          {options ? (
            <>
              <div className="flex items-center justify-between text-xs">
                <button type="button" className="font-medium text-primary hover:underline" onClick={() => onChange("")}>Tümünü seç</button>
                <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => onChange("")}>Seçimi kaldır</button>
              </div>
              <Input value={optionSearch} onChange={(event) => setOptionSearch(event.target.value)} placeholder="Seçenek ara..." />
              <div className="max-h-56 space-y-1 overflow-y-auto">
              {visibleOptions.length === 0 ? (
                <p className="py-3 text-center text-xs text-muted-foreground">Seçenek bulunamadı.</p>
              ) : visibleOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => onChange(value === option.value ? "" : option.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent",
                    value === option.value && "bg-primary/10 text-primary",
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {value === option.value && <Check className="h-4 w-4 shrink-0" />}
                </button>
              ))}
              </div>
            </>
          ) : (
            <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
          )}

          {active && (
            <Button type="button" size="sm" variant="ghost" className="w-full" onClick={() => onChange("")}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Filtreyi temizle
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
