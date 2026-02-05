import { useState } from 'react';
import { DndContext, closestCorners, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useKanbanBoard, useMoveTicket, useAddTicketToBoard } from '@/api/kanban';
import { useTickets } from '@/api/tickets';
import { KanbanSwimlane } from './KanbanSwimlane';
import { KanbanConfig } from './KanbanConfig';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface KanbanViewProps {
  boardId: number;
}

export function KanbanView({ boardId }: KanbanViewProps) {
  const { data: board } = useKanbanBoard(boardId);
  const moveTicket = useMoveTicket();
  const addTicketToBoard = useAddTicketToBoard();
  const [showConfig, setShowConfig] = useState(false);
  const [showAddTicket, setShowAddTicket] = useState(false);
  const [addTicketId, setAddTicketId] = useState('');

  const { data: ticketsData } = useTickets({ per_page: 200 });
  const allTickets = ticketsData?.data || [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  if (!board) return null;

  const { columns, swimlanes, positions } = board;

  // Find tickets not on this board
  const ticketIdsOnBoard = new Set(positions.map(p => p.ticket_id));
  const availableTickets = allTickets.filter(t => !ticketIdsOnBoard.has(t.id));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const posId = Number(String(active.id).replace('pos-', ''));
    const overId = String(over.id);

    // Determine target column and swimlane from droppable
    if (overId.startsWith('col-')) {
      const parts = overId.split('-');
      // col-{colId}-swim-{swimId|none}
      const colId = Number(parts[1]);
      const swimId = parts[3] === 'none' ? undefined : Number(parts[3]);

      moveTicket.mutate({
        positionId: posId,
        boardId,
        column_id: colId,
        swimlane_id: swimId,
        sort_order: 0,
      });
    }
  };

  const handleAddTicket = async () => {
    if (!addTicketId) return;
    const firstCol = columns[0];
    if (!firstCol) {
      toast.error('Nejdříve přidejte sloupce v konfiguraci');
      return;
    }
    try {
      await addTicketToBoard.mutateAsync({
        boardId,
        ticket_id: Number(addTicketId),
        column_id: firstCol.id,
      });
      toast.success('Tiket přidán na nástěnku');
      setAddTicketId('');
      setShowAddTicket(false);
    } catch {
      toast.error('Nepodařilo se přidat tiket');
    }
  };

  const hasSwimlanes = swimlanes.length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 shadow-[0_1px_0_0_var(--color-border)] shrink-0">
        <h3 className="text-base font-semibold font-heading">{board.name}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddTicket(true)}>
            <Plus className="h-3 w-3 mr-1" /> Přidat tiket
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowConfig(true)}>
            <Settings className="h-3 w-3 mr-1" /> Konfigurace
          </Button>
        </div>
      </div>

      {columns.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Přidejte sloupce v konfiguraci
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-auto shadow-[0_-1px_0_0_var(--color-border)]">
          {/* Sticky column headers */}
          <div className="flex sticky top-0 z-10 bg-muted/60 backdrop-blur-sm shadow-[0_1px_0_0_var(--color-border)] shrink-0">
            {columns.map((col) => {
              const colTickets = positions.filter(p => p.column_id === col.id);
              const isOverWip = col.wip_limit ? colTickets.length >= col.wip_limit : false;
              return (
                <div key={col.id} className="flex-1 min-w-0 flex items-center justify-between px-3 py-2.5 shadow-[1px_0_0_0_var(--color-border)] last:shadow-none">
                  <div className="flex items-center gap-2 min-w-0">
                    {col.color && <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }} />}
                    <span className="text-sm font-semibold truncate font-heading">{col.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{colTickets.length}</span>
                  </div>
                  {col.wip_limit && (
                    <span className={cn('text-xs shrink-0', isOverWip ? 'text-red-600 font-semibold' : 'text-muted-foreground')}>
                      max {col.wip_limit}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Board content */}
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="flex-1">
              {hasSwimlanes ? (
                <>
                  {swimlanes.map(sw => (
                    <KanbanSwimlane
                      key={sw.id}
                      swimlane={sw}
                      columns={columns}
                      tickets={positions.filter(p => p.swimlane_id === sw.id)}
                    />
                  ))}
                  {/* Tickets without swimlane */}
                  {positions.some(p => p.swimlane_id === null) && (
                    <KanbanSwimlane
                      swimlane={{ id: 0, board_id: boardId, name: 'Nepřiřazené', sort_order: 999, color: null, group_by: null, group_value: null } as any}
                      columns={columns}
                      tickets={positions.filter(p => p.swimlane_id === null)}
                    />
                  )}
                </>
              ) : (
                <KanbanSwimlane
                  swimlane={null}
                  columns={columns}
                  tickets={positions}
                />
              )}
            </div>
          </DndContext>
        </div>
      )}

      <KanbanConfig
        open={showConfig}
        onOpenChange={setShowConfig}
        boardId={boardId}
        columns={columns}
        swimlanes={swimlanes}
      />

      <Dialog open={showAddTicket} onOpenChange={setShowAddTicket}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Přidat tiket na nástěnku</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Select value={addTicketId} onChange={e => setAddTicketId(e.target.value)}>
              <option value="">Vyberte tiket...</option>
              {availableTickets.map(t => (
                <option key={t.id} value={t.id}>{t.external_id} - {t.title}</option>
              ))}
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTicket(false)}>Zrušit</Button>
            <Button onClick={handleAddTicket} disabled={!addTicketId}>Přidat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
