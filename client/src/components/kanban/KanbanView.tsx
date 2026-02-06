import { useState } from 'react';
import { DndContext, closestCenter, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useKanbanBoard, useMoveTicket, useAddTicketToBoard, useRemoveTicketFromBoard } from '@/api/kanban';
import { useTickets } from '@/api/tickets';
import { KanbanSwimlane } from './KanbanSwimlane';
import { KanbanConfig } from './KanbanConfig';
import { KanbanCardContent } from './KanbanCard';
import { TicketDetail } from '@/components/tickets/TicketDetail';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui-store';
import { toast } from 'sonner';

interface KanbanViewProps {
  boardId: number;
  configOpen?: boolean;
  onConfigOpenChange?: (open: boolean) => void;
  addTicketOpen?: boolean;
  onAddTicketOpenChange?: (open: boolean) => void;
}

export function KanbanView({ boardId, configOpen, onConfigOpenChange, addTicketOpen, onAddTicketOpenChange }: KanbanViewProps) {
  const { data: board } = useKanbanBoard(boardId);
  const moveTicket = useMoveTicket();
  const addTicketToBoard = useAddTicketToBoard();
  const removeTicketFromBoard = useRemoveTicketFromBoard();
  const [showConfigInternal, setShowConfigInternal] = useState(false);
  const [showAddTicketInternal, setShowAddTicketInternal] = useState(false);
  const showConfig = configOpen ?? showConfigInternal;
  const setShowConfig = onConfigOpenChange ?? setShowConfigInternal;
  const showAddTicket = addTicketOpen ?? showAddTicketInternal;
  const setShowAddTicket = onAddTicketOpenChange ?? setShowAddTicketInternal;
  const [addTicketId, setAddTicketId] = useState('');
  const [showTicketDetail, setShowTicketDetail] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const selectTicket = useUiStore(s => s.selectTicket);

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const posId = Number(String(active.id).replace('pos-', ''));
    const overId = String(over.id);

    let targetColId: number | undefined;
    let targetSwimId: number | undefined;
    let targetSortOrder = 0;

    if (overId.startsWith('col-')) {
      // Dropped on column droppable area
      const parts = overId.split('-');
      targetColId = Number(parts[1]);
      targetSwimId = parts[3] === 'none' ? undefined : Number(parts[3]);
      // Place at end of column
      const colTickets = positions.filter(p =>
        p.column_id === targetColId &&
        (targetSwimId ? p.swimlane_id === targetSwimId : p.swimlane_id === null)
      );
      targetSortOrder = colTickets.length > 0
        ? Math.max(...colTickets.map(p => p.sort_order)) + 1
        : 0;
    } else if (overId.startsWith('pos-')) {
      // Dropped on another card — resolve its column/swimlane
      const overPosId = Number(overId.replace('pos-', ''));
      const targetPos = positions.find(p => p.id === overPosId);
      if (targetPos) {
        targetColId = targetPos.column_id;
        targetSwimId = targetPos.swimlane_id ?? undefined;
        targetSortOrder = targetPos.sort_order;
      }
    }

    if (targetColId !== undefined) {
      moveTicket.mutate({
        positionId: posId,
        boardId,
        column_id: targetColId,
        swimlane_id: targetSwimId,
        sort_order: targetSortOrder,
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

  const handleCardClick = (ticketId: number) => {
    selectTicket(ticketId);
    setShowTicketDetail(true);
  };

  const handleRemoveTicket = (positionId: number) => {
    removeTicketFromBoard.mutate({ positionId, boardId }, {
      onSuccess: () => toast.success('Tiket odebrán z nástěnky'),
      onError: () => toast.error('Nepodařilo se odebrat tiket'),
    });
  };

  const hasSwimlanes = swimlanes.length > 0;

  return (
    <div className="h-full flex flex-col">
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex-1">
              {hasSwimlanes ? (
                <>
                  {swimlanes.map(sw => (
                    <KanbanSwimlane
                      key={sw.id}
                      swimlane={sw}
                      columns={columns}
                      tickets={positions.filter(p => p.swimlane_id === sw.id)}
                      isDragActive={!!activeId}
                      onCardClick={handleCardClick}
                      onRemoveTicket={handleRemoveTicket}
                    />
                  ))}
                  {/* Tickets without swimlane */}
                  {positions.some(p => p.swimlane_id === null) && (
                    <KanbanSwimlane
                      swimlane={{ id: 0, board_id: boardId, name: 'Nepřiřazené', sort_order: 999, color: null, group_by: null, group_value: null } as any}
                      columns={columns}
                      tickets={positions.filter(p => p.swimlane_id === null)}
                      isDragActive={!!activeId}
                      onCardClick={handleCardClick}
                      onRemoveTicket={handleRemoveTicket}
                    />
                  )}
                </>
              ) : (
                <KanbanSwimlane
                  swimlane={null}
                  columns={columns}
                  tickets={positions}
                  isDragActive={!!activeId}
                  onCardClick={handleCardClick}
                  onRemoveTicket={handleRemoveTicket}
                />
              )}
            </div>
            <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
              {activeId ? (() => {
                const posId = Number(activeId.replace('pos-', ''));
                const pos = positions.find(p => p.id === posId);
                if (!pos) return null;
                return (
                  <div className="w-[250px]">
                    <KanbanCardContent
                      title={pos.title}
                      externalId={pos.external_id}
                      priority={pos.priority}
                      providerType={pos.provider_type}
                      assignee={pos.assignee}
                      isOverlay
                    />
                  </div>
                );
              })() : null}
            </DragOverlay>
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

      <Dialog open={showTicketDetail} onOpenChange={(open) => {
        setShowTicketDetail(open);
        if (!open) selectTicket(null);
      }}>
        <DialogContent className="w-full max-w-3xl h-[85vh] p-0 overflow-hidden">
          <TicketDetail />
        </DialogContent>
      </Dialog>

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
