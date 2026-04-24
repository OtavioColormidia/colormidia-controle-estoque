import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** tone para o badge do ícone */
  tone?: 'primary' | 'accent' | 'success' | 'warning' | 'destructive' | 'muted';
  actions?: ReactNode;
  className?: string;
}

const toneClasses: Record<NonNullable<PageHeaderProps['tone']>, string> = {
  primary: 'bg-primary/10 text-primary ring-primary/20',
  accent: 'bg-accent/15 text-accent-foreground ring-accent/30',
  success: 'bg-success/10 text-success ring-success/20',
  warning: 'bg-warning/10 text-warning ring-warning/20',
  destructive: 'bg-destructive/10 text-destructive ring-destructive/20',
  muted: 'bg-muted text-muted-foreground ring-border',
};

export default function PageHeader({
  title,
  description,
  icon: Icon,
  tone = 'primary',
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="flex items-start gap-4 min-w-0">
        {Icon && (
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1',
              toneClasses[tone],
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
    </div>
  );
}
