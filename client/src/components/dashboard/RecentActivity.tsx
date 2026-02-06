import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';
import { Clock, Tag, ArrowUpRight } from 'lucide-react';
import type { RecentActivity as RecentActivityType } from '@kohout/shared';

const statusColors: Record<string, string> = {
  open: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  in_progress: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  resolved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  closed: 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400',
  unknown: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
};

const statusLabels: Record<string, string> = {
  open: 'Otevřené',
  in_progress: 'V řešení',
  resolved: 'Vyřešené',
  closed: 'Uzavřené',
  unknown: 'Neznámý',
};

const priorityColors: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  high: 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
  medium: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  low: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  none: 'bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400',
};

const priorityLabels: Record<string, string> = {
  critical: 'Kritická',
  high: 'Vysoká',
  medium: 'Střední',
  low: 'Nízká',
  none: 'Žádná',
};

const providerLabels: Record<string, string> = {
  jira: 'Jira',
  'azure-devops': 'Azure',
};

interface RecentActivityProps {
  activities: RecentActivityType[];
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diffMs = now - d;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'právě teď';
  if (minutes < 60) return `před ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `před ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `před ${days} d`;
  return new Date(dateStr).toLocaleDateString('cs');
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const navigate = useNavigate();
  const selectTicket = useUiStore(s => s.selectTicket);

  const handleClick = (ticketId: number) => {
    selectTicket(ticketId);
    navigate('/tickets');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Nedávná aktivita</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[28rem]">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Žádná aktivita</p>
          ) : (
            <div className="space-y-1">
              {activities.map((a, i) => (
                <button
                  key={i}
                  onClick={() => handleClick(a.ticket_id)}
                  className="group w-full text-left rounded-lg p-3 hover:bg-accent/50 transition-all duration-150"
                >
                  {/* Row 1: external_id + provider + priority + status + time */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground font-mono">{a.external_id}</span>
                    <span className="text-xs text-muted-foreground">{providerLabels[a.provider_type] || a.provider_type}</span>
                    {a.priority !== 'none' && (
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 leading-4', priorityColors[a.priority])}>
                        {priorityLabels[a.priority] || a.priority}
                      </Badge>
                    )}
                    <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 leading-4', statusColors[a.status])}>
                      {statusLabels[a.status] || a.status}
                    </Badge>
                    <span className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                      {timeAgo(a.timestamp)}
                    </span>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>

                  {/* Row 2: title */}
                  <p className="text-sm font-medium truncate">{a.ticket_title}</p>

                  {/* Row 3: assignee + tags + categories */}
                  {(a.assignee || a.categories.length > 0 || a.local_tags.length > 0 || a.external_tags.length > 0) && (
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {a.assignee && (
                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">{a.assignee}</span>
                      )}
                      {a.categories.map(cat => (
                        <Badge
                          key={`cat-${cat.id}`}
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 leading-4"
                          style={{ backgroundColor: cat.color + '20', color: cat.color }}
                        >
                          {cat.name}
                        </Badge>
                      ))}
                      {a.local_tags.map(tag => (
                        <Badge
                          key={`tag-${tag.id}`}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 leading-4 gap-0.5"
                          style={{ borderColor: tag.color + '60', color: tag.color }}
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {tag.name}
                        </Badge>
                      ))}
                      {a.external_tags.slice(0, 3).map(tag => (
                        <Badge
                          key={`ext-${tag}`}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 leading-4 text-muted-foreground"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {a.external_tags.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{a.external_tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
