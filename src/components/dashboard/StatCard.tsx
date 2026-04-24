import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  trend?: { value: number; label?: string };
  onClick?: () => void;
}

const toneMap: Record<NonNullable<StatCardProps['tone']>, { bg: string; text: string; ring: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-primary', ring: 'ring-primary/20' },
  success: { bg: 'bg-success/10', text: 'text-success', ring: 'ring-success/20' },
  warning: { bg: 'bg-warning/10', text: 'text-warning', ring: 'ring-warning/20' },
  danger: { bg: 'bg-destructive/10', text: 'text-destructive', ring: 'ring-destructive/20' },
  neutral: { bg: 'bg-muted', text: 'text-muted-foreground', ring: 'ring-border' },
};

export function StatCard({ label, value, hint, icon: Icon, tone = 'primary', trend, onClick }: StatCardProps) {
  const t = toneMap[tone];
  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-5 border shadow-sm transition-all duration-200 group',
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1.5 tabular-nums truncate">{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1 truncate">{hint}</p>}
          {trend && (
            <div
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium mt-2 px-1.5 py-0.5 rounded-md',
                trend.value >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
              )}
            >
              {trend.value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(trend.value)}% {trend.label ?? ''}
            </div>
          )}
        </div>
        <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center ring-1 flex-shrink-0', t.bg, t.ring)}>
          <Icon className={cn('h-5 w-5', t.text)} />
        </div>
      </div>
    </Card>
  );
}
