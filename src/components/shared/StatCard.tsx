import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'primary' | 'success' | 'warning' | 'destructive' | 'accent';
  className?: string;
}

const accentMap: Record<NonNullable<StatCardProps['accent']>, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  accent: 'bg-accent/10 text-accent',
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = 'primary',
  className,
}: StatCardProps) {
  return (
    <Card className={cn('p-5 border shadow-sm hover:shadow-md transition-shadow', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1 truncate">{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
        <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0', accentMap[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
