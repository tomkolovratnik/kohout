import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '@/stores/ui-store';
import type { RecentActivity as RecentActivityType } from '@kohout/shared';

interface RecentActivityProps {
  activities: RecentActivityType[];
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
        <CardTitle className="text-base">Nedávná aktivita</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Žádná aktivita</p>
          ) : (
            <div className="space-y-3">
              {activities.map((a, i) => (
                <button
                  key={i}
                  onClick={() => handleClick(a.ticket_id)}
                  className="w-full text-left flex items-start gap-3 hover:bg-accent/50 rounded-lg p-2 transition-all duration-150"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.ticket_title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.external_id} &middot; {new Date(a.timestamp).toLocaleString('cs')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
