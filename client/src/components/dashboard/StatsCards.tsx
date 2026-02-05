import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Ticket, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import type { DashboardStats } from '@kohout/shared';

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    { label: 'Celkem tiketů', value: stats.total_tickets, icon: Ticket, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/50' },
    { label: 'Otevřené', value: (stats.by_status?.open || 0) + (stats.by_status?.in_progress || 0), icon: AlertCircle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/50' },
    { label: 'V řešení', value: stats.by_status?.in_progress || 0, icon: Clock, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/50' },
    { label: 'Uzavřené', value: (stats.by_status?.closed || 0) + (stats.by_status?.resolved || 0), icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{card.label}</CardTitle>
            <div className={`rounded-lg p-2 ${card.bg}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight font-heading">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
