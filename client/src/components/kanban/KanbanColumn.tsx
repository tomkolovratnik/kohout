import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import { cn } from '@/lib/utils';
import type { KanbanColumn as ColumnType } from '@kohout/shared';

interface TicketPosition {
  id: number;
  ticket_id: number;
  column_id: number;
  swimlane_id: number | null;
  sort_order: number;
  title: string;
  status: string;
  priority: string;
  external_id: string;
  provider_type: string;
  assignee: string | null;
}

interface KanbanColumnProps {
  column: ColumnType;
  tickets: TicketPosition[];
  swimlaneId: number | null;
  showHeader?: boolean;
}

export function KanbanColumn({ column, tickets, swimlaneId, showHeader = false }: KanbanColumnProps) {
  const droppableId = `col-${column.id}-swim-${swimlaneId ?? 'none'}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  const sortedTickets = [...tickets].sort((a, b) => a.sort_order - b.sort_order);
  const isOverWip = column.wip_limit ? tickets.length >= column.wip_limit : false;

  return (
    <div className="flex flex-col flex-1 min-w-0 shadow-[1px_0_0_0_var(--color-border)/0.3] last:shadow-none">
      {showHeader && (
        <div className="flex items-center justify-between px-3 py-2 shadow-[0_1px_0_0_var(--color-border)/0.3] bg-muted/40">
          <div className="flex items-center gap-2 min-w-0">
            {column.color && <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: column.color }} />}
            <span className="text-sm font-semibold truncate font-heading">{column.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">{tickets.length}</span>
          </div>
          {column.wip_limit && (
            <span className={cn('text-xs shrink-0', isOverWip ? 'text-red-600 font-semibold' : 'text-muted-foreground')}>
              max {column.wip_limit}
            </span>
          )}
        </div>
      )}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-2 p-2 transition-colors min-h-[80px]',
          isOver && 'bg-accent/40 rounded-lg',
          isOverWip && 'ring-2 ring-inset ring-red-300'
        )}
      >
        <SortableContext items={sortedTickets.map(t => `pos-${t.id}`)} strategy={verticalListSortingStrategy}>
          {sortedTickets.map((ticket) => (
            <KanbanCard
              key={ticket.id}
              id={`pos-${ticket.id}`}
              ticketId={ticket.ticket_id}
              title={ticket.title}
              externalId={ticket.external_id}
              status={ticket.status}
              priority={ticket.priority}
              providerType={ticket.provider_type}
              assignee={ticket.assignee}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
