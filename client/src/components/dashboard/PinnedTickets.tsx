import { usePinnedTickets } from '@/api/dashboard';
import { useTogglePin } from '@/api/tickets';
import { useUiStore } from '@/stores/ui-store';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Pin, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Ticket } from '@kohout/shared';

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

export function PinnedTickets() {
  const { data: tickets = [] } = usePinnedTickets();
  const togglePin = useTogglePin();
  const navigate = useNavigate();
  const selectTicket = useUiStore(s => s.selectTicket);

  if (tickets.length === 0) return null;

  const handleClick = (ticketId: number) => {
    selectTicket(ticketId);
    navigate('/tickets');
  };

  const handleUnpin = (e: React.MouseEvent, ticket: Ticket) => {
    e.stopPropagation();
    togglePin.mutate({ ticketId: ticket.id, is_pinned: false });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Pin className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold font-heading">Připnuté tikety</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {tickets.map((ticket: Ticket) => (
          <button
            key={ticket.id}
            onClick={() => handleClick(ticket.id)}
            className="group text-left rounded-xl ring-1 ring-border/40 bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] p-4 transition-all duration-150"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground font-mono">{ticket.external_id}</span>
                  <Badge variant="secondary" className={cn('text-xs px-1.5 py-0', statusColors[ticket.status])}>
                    {statusLabels[ticket.status] || ticket.status}
                  </Badge>
                </div>
                <p className="text-sm font-medium truncate">{ticket.title}</p>
                {ticket.assignee && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{ticket.assignee}</p>
                )}
              </div>
              <button
                onClick={(e) => handleUnpin(e, ticket)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-accent transition-all"
                title="Odepnout"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
