import { KanbanColumn } from './KanbanColumn';
import type { KanbanColumn as ColumnType, KanbanSwimlane as SwimlaneType } from '@kohout/shared';

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

interface KanbanSwimlaneProps {
  swimlane: SwimlaneType | null;
  columns: ColumnType[];
  tickets: TicketPosition[];
  showColumnHeaders?: boolean;
}

export function KanbanSwimlane({ swimlane, columns, tickets, showColumnHeaders = false }: KanbanSwimlaneProps) {
  const swimlaneId = swimlane?.id ?? null;

  return (
    <div className="shadow-[0_1px_0_0_var(--color-border)/0.3] last:shadow-none">
      {swimlane && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/20 shadow-[0_1px_0_0_var(--color-border)/0.3]">
          {swimlane.color && <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: swimlane.color }} />}
          <h3 className="text-sm font-semibold font-heading">{swimlane.name}</h3>
          {swimlane.group_by && (
            <span className="text-xs text-muted-foreground">({swimlane.group_by})</span>
          )}
        </div>
      )}
      <div className="flex">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tickets={tickets.filter(t => t.column_id === col.id)}
            swimlaneId={swimlaneId}
            showHeader={showColumnHeaders}
          />
        ))}
      </div>
    </div>
  );
}
