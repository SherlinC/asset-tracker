import { type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  description?: string;
  // For "AI Strategy" style: icon + text label (no border/bg)
  topLabel?: {
    icon?: LucideIcon;
    text: string;
  };
  // For "Global Wallet" style: pill badge (border/bg)
  pillLabel?: {
    icon?: LucideIcon;
    text: string;
  };
  children?: React.ReactNode; // Right side actions
  className?: string;
}

export default function PageHeader({
  title,
  description,
  topLabel,
  pillLabel,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-start md:justify-between",
        className
      )}
    >
      <div className="space-y-3">
        {/* Top Label (AI Strategy Style) */}
        {topLabel && (
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {topLabel.icon && <topLabel.icon className="h-4 w-4" />}
            {topLabel.text}
          </div>
        )}

        {/* Pill Label (Global Wallet Style) */}
        {pillLabel && (
          <Badge
            variant="outline"
            className="w-fit gap-2 px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            {pillLabel.icon && <pillLabel.icon className="h-3.5 w-3.5" />}
            {pillLabel.text}
          </Badge>
        )}

        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="max-w-4xl text-base text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>

      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
