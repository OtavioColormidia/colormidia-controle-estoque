import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
  iconAccent?: 'primary' | 'accent' | 'success' | 'warning' | 'destructive';
}

const accentStyles: Record<NonNullable<PageHeaderProps['iconAccent']>, string> = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent/10 text-accent',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
};

export default function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
  iconAccent = 'primary',
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/60 animate-fade-in">
      <div className="flex items-start gap-4 min-w-0">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${accentStyles[iconAccent]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight truncate">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
