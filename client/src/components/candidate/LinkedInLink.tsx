import { Linkedin } from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkedInLinkProps {
  url?: string | null;
  className?: string;
  showLabel?: boolean;
}

function normalizeExternalUrl(url?: string | null) {
  const value = url?.trim();
  if (!value) return null;

  const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function LinkedInLink({ url, className, showLabel = false }: LinkedInLinkProps) {
  const href = normalizeExternalUrl(url);

  if (!href) {
    return <span className={cn("text-sm text-muted-foreground/40", className)}>—</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      aria-label="LinkedIn profilini yeni sekmede aç"
      title="LinkedIn profilini aç"
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[#0A66C2]/15 bg-[#0A66C2]/10 px-2 text-[#0A66C2] transition-colors hover:border-[#0A66C2] hover:bg-[#0A66C2] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] focus-visible:ring-offset-2",
        showLabel ? "text-xs font-medium" : "w-8",
        className
      )}
    >
      <Linkedin className="h-4 w-4" aria-hidden="true" />
      {showLabel && <span>LinkedIn</span>}
    </a>
  );
}
