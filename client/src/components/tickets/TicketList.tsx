import { useEffect, useCallback } from 'react';
import { useTickets } from '@/api/tickets';
import { useFiltersStore } from '@/stores/filters-store';
import { useUiStore } from '@/stores/ui-store';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Pin, GripVertical } from 'lucide-react';
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
  unknown: 'Neznámý stav',
};

const priorityColors: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  high: 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
  medium: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  low: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  none: 'bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400',
};

const priorityDotColors: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500',
  none: 'bg-slate-400',
};

function DraggableTicketItem({ ticket, isSelected, onSelect }: { ticket: Ticket; isSelected: boolean; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `ticket-${ticket.id}`,
    data: { type: 'ticket', title: ticket.title, externalId: ticket.external_id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-ticket-id={ticket.id}
      className={cn(
        'w-full text-left p-3 rounded-lg transition-all duration-150 flex items-start gap-2',
        isSelected
          ? 'bg-accent ring-1 ring-primary/20'
          : 'hover:bg-accent/40',
        isDragging && 'opacity-50 shadow-lg ring-primary/30'
      )}
    >
      <button {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing shrink-0" onClick={e => e.stopPropagation()}>
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <button className="flex-1 min-w-0 text-left" onClick={onSelect}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground font-mono">{ticket.external_id}</span>
              <Badge variant="outline" className={cn('text-xs px-1.5 py-0', priorityColors[ticket.priority])} title="Priorita">
                {ticket.priority}
              </Badge>
            </div>
            <p className="text-sm font-medium truncate" title={ticket.title}>{ticket.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className={cn('text-xs px-1.5 py-0', statusColors[ticket.status])} title="Stav">
                {statusLabels[ticket.status] || ticket.status}
              </Badge>
              <span className="text-xs text-muted-foreground" title="Zdroj">{ticket.provider_type}</span>
              {ticket.assignee && <span className="text-xs text-muted-foreground truncate">{ticket.assignee}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {ticket.is_pinned && <Pin className="h-3 w-3 text-primary" />}
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {new Date(ticket.updated_at).toLocaleDateString('cs')}
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}

function CompactTicketItem({ ticket, isSelected, onSelect }: { ticket: Ticket; isSelected: boolean; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `ticket-${ticket.id}`,
    data: { type: 'ticket', title: ticket.title, externalId: ticket.external_id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-ticket-id={ticket.id}
      className={cn(
        'flex items-center gap-2 px-2 h-9 rounded-md transition-all duration-150 text-sm group',
        isSelected
          ? 'bg-accent ring-1 ring-primary/20'
          : 'hover:bg-accent/40',
        isDragging && 'opacity-50 shadow-lg ring-primary/30'
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <button className="flex items-center gap-2 flex-1 min-w-0 text-left h-full" onClick={onSelect}>
        <span className="text-xs text-muted-foreground font-mono shrink-0 w-24 truncate">{ticket.external_id}</span>
        <span className={cn('h-2 w-2 rounded-full shrink-0', priorityDotColors[ticket.priority])} title={ticket.priority} />
        <span className="truncate flex-1" title={ticket.title}>{ticket.title}</span>
        <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 shrink-0', statusColors[ticket.status])}>
          {statusLabels[ticket.status] || ticket.status}
        </Badge>
        <span className="text-xs text-muted-foreground shrink-0 w-12 text-center">{ticket.provider_type === 'azure-devops' ? 'ADO' : 'Jira'}</span>
        {ticket.assignee && <span className="text-xs text-muted-foreground truncate max-w-24 hidden lg:inline">{ticket.assignee}</span>}
        <span className="text-xs text-muted-foreground shrink-0 w-16 text-right">
          {new Date(ticket.updated_at).toLocaleDateString('cs')}
        </span>
        {ticket.is_pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
      </button>
    </div>
  );
}

export function TicketList() {
  const filters = useFiltersStore();
  const selectedId = useUiStore(s => s.selectedTicketId);
  const selectTicket = useUiStore(s => s.selectTicket);
  const viewMode = useUiStore(s => s.ticketViewMode);

  const { data, isLoading } = useTickets({
    page: filters.page,
    status: filters.status || undefined,
    priority: filters.priority || undefined,
    provider_type: filters.provider_type || undefined,
    assignee: filters.assignee || undefined,
    category_id: filters.category_id ? Number(filters.category_id) : undefined,
    tag_id: filters.tag_id ? Number(filters.tag_id) : undefined,
    folder_id: filters.folder_id || undefined,
    sort_by: filters.sort_by,
    sort_order: filters.sort_order,
    q: filters.q || undefined,
  });

  const tickets = data?.data || [];
  const totalPages = data?.total_pages || 0;

  const handleKeyNav = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (tickets.length === 0) return;

    e.preventDefault();
    (document.activeElement as HTMLElement)?.blur?.();
    const currentIdx = tickets.findIndex((t: Ticket) => t.id === selectedId);
    let nextIdx: number;

    if (e.key === 'ArrowDown') {
      nextIdx = currentIdx < 0 ? 0 : Math.min(currentIdx + 1, tickets.length - 1);
    } else {
      nextIdx = currentIdx < 0 ? 0 : Math.max(currentIdx - 1, 0);
    }

    const nextTicket = tickets[nextIdx];
    selectTicket(nextTicket.id);

    // Scroll into view
    const el = document.querySelector(`[data-ticket-id="${nextTicket.id}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [tickets, selectedId, selectTicket]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyNav);
    return () => document.removeEventListener('keydown', handleKeyNav);
  }, [handleKeyNav]);

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Načítání...</div>;
  }

  if (tickets.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">Žádné tikety. Importujte tiket z Jira nebo Azure DevOps.</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className={cn('p-1', viewMode === 'compact' ? 'space-y-px' : 'space-y-0.5')}>
          {tickets.map((ticket: Ticket) => {
            const ItemComponent = viewMode === 'compact' ? CompactTicketItem : DraggableTicketItem;
            return (
              <ItemComponent
                key={ticket.id}
                ticket={ticket}
                isSelected={selectedId === ticket.id}
                onSelect={() => selectTicket(ticket.id)}
              />
            );
          })}
        </div>
      </ScrollArea>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 shadow-[0_-1px_0_0_var(--color-border)] text-xs">
          <Button variant="ghost" size="sm" disabled={filters.page <= 1} onClick={() => filters.setPage(filters.page - 1)}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span>{filters.page} / {totalPages}</span>
          <Button variant="ghost" size="sm" disabled={filters.page >= totalPages} onClick={() => filters.setPage(filters.page + 1)}>
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
