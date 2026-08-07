import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface CandidateIdentityProps {
  candidateId: number;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  subtitle?: string | null;
  compact?: boolean;
  className?: string;
}

function getInitials(fullName: string, firstName?: string | null, lastName?: string | null) {
  const explicit = `${firstName?.[0] || ""}${lastName?.[0] || ""}`;
  if (explicit) return explicit.toLocaleUpperCase("tr-TR");

  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toLocaleUpperCase("tr-TR");
}

export function CandidateIdentity({
  candidateId,
  fullName,
  firstName,
  lastName,
  subtitle,
  compact = false,
  className,
}: CandidateIdentityProps) {
  return (
    <Link
      href={`/adaylar/${candidateId}`}
      className={cn("group/candidate flex min-w-0 items-center", compact ? "gap-2.5" : "gap-3", className)}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/25 to-primary/5 font-display font-semibold text-primary transition-colors group-hover/candidate:from-primary group-hover/candidate:to-primary group-hover/candidate:text-primary-foreground",
          compact ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs"
        )}
      >
        {getInitials(fullName, firstName, lastName)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground transition-colors group-hover/candidate:text-primary">
          {fullName}
        </span>
        {subtitle && (
          <span className={cn("block truncate text-muted-foreground", compact ? "text-[10px]" : "text-xs")}>
            {subtitle}
          </span>
        )}
      </span>
    </Link>
  );
}
