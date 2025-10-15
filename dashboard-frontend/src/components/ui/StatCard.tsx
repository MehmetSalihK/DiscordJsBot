import { ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
};

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  trendValue,
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-card text-card-foreground rounded-lg border shadow-sm',
        className
      )}
      {...props}
    >
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold">{value}</h3>
              {trend && (
                <span
                  className={cn(
                    'inline-flex items-center text-xs font-medium',
                    trend === 'up' && 'text-green-600 dark:text-green-400',
                    trend === 'down' && 'text-red-600 dark:text-red-400',
                    trend === 'neutral' && 'text-amber-600 dark:text-amber-400'
                  )}
                >
                  {trend === 'up' && <ArrowUp className="h-3 w-3" />}
                  {trend === 'down' && <ArrowDown className="h-3 w-3" />}
                  {trend === 'neutral' && <ArrowRight className="h-3 w-3" />}
                  {trendValue}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-3 text-primary">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}
