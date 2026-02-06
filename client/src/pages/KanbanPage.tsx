import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { KanbanView } from '@/components/kanban/KanbanView';
import { useKanbanBoards, useCreateBoard, useDeleteBoard, useUpdateBoard } from '@/api/kanban';
import { useUiStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ColorPicker } from '@/components/ui/color-picker';
import { Download, Plus, Settings, Trash2 } from 'lucide-react';
import { ImportDialog } from '@/components/tickets/ImportDialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { KanbanBoard } from '@kohout/shared';

export function KanbanPage() {
  const { data: boards = [] } = useKanbanBoards();
  const createBoard = useCreateBoard();
  const deleteBoard = useDeleteBoard();
  const updateBoard = useUpdateBoard();
  const selectedBoardId = useUiStore(s => s.selectedBoardId);
  const selectBoard = useUiStore(s => s.selectBoard);
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardColor, setNewBoardColor] = useState('#6366f1');

  // Edit dialog state
  const [editBoard, setEditBoard] = useState<KanbanBoard | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  // KanbanView dialog state (lifted up)
  const [showConfig, setShowConfig] = useState(false);
  const [showAddTicket, setShowAddTicket] = useState(false);

  // Auto-select first board
  if (!selectedBoardId && boards.length > 0) {
    selectBoard(boards[0].id);
  }

  const handleCreate = async () => {
    if (!newBoardName.trim()) return;
    const board = await createBoard.mutateAsync({ name: newBoardName.trim(), color: newBoardColor });
    selectBoard(board.id);
    setNewBoardName('');
    setNewBoardColor('#6366f1');
    setShowCreate(false);
    toast.success('Nástěnka vytvořena');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Opravdu smazat nástěnku?')) return;
    await deleteBoard.mutateAsync(id);
    if (selectedBoardId === id) selectBoard(null);
    toast.success('Nástěnka smazána');
  };

  const handleEditOpen = (board: KanbanBoard) => {
    setEditBoard(board);
    setEditName(board.name);
    setEditColor(board.color || '#6366f1');
  };

  const handleEditSave = async () => {
    if (!editBoard || !editName.trim()) return;
    await updateBoard.mutateAsync({ id: editBoard.id, name: editName.trim(), color: editColor });
    setEditBoard(null);
    toast.success('Nástěnka upravena');
  };

  return (
    <>
      <Header title="Kanban" actions={
        <Button size="sm" variant="outline" onClick={() => setShowImport(true)}>
          <Download className="h-4 w-4 mr-1" /> Import
        </Button>
      } />
      <div className="flex items-center justify-between gap-2 px-4 py-2 shadow-[0_1px_0_0_var(--color-border)]">
        <div className="inline-flex items-center rounded-lg bg-secondary/60 p-1 gap-1 overflow-x-auto">
          {boards.map((board: any) => {
            const isActive = selectedBoardId === board.id;
            const accentColor = board.color || 'var(--color-primary)';
            return (
              <button
                key={board.id}
                className={cn(
                  'group inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                  isActive
                    ? 'bg-background text-foreground font-semibold ring-1 ring-border/50'
                    : 'text-muted-foreground font-medium hover:text-foreground hover:bg-background/50'
                )}
                style={isActive ? {
                  boxShadow: `0 2px 6px -1px rgb(0 0 0 / 0.12), 0 1px 2px -1px rgb(0 0 0 / 0.06), inset 0 -2.5px 0 0 ${accentColor}`,
                } : undefined}
                onClick={() => selectBoard(board.id)}
                onDoubleClick={() => handleEditOpen(board)}
              >
                {board.color && (
                  <span
                    className={cn('rounded-full shrink-0', isActive ? 'h-2.5 w-2.5' : 'h-2 w-2')}
                    style={{ backgroundColor: board.color }}
                  />
                )}
                {board.name}
                <span
                  role="button"
                  tabIndex={0}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive rounded p-0.5"
                  onClick={(e) => { e.stopPropagation(); handleDelete(board.id); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleDelete(board.id); } }}
                >
                  <Trash2 className="h-3 w-3" />
                </span>
              </button>
            );
          })}
          <button
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-3 w-3" /> Nová nástěnka
          </button>
        </div>
        {selectedBoardId && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setShowAddTicket(true)}>
              <Plus className="h-3 w-3 mr-1" /> Přidat tiket
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowConfig(true)}>
              <Settings className="h-3 w-3 mr-1" /> Konfigurace
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {selectedBoardId ? (
          <KanbanView
            boardId={selectedBoardId}
            configOpen={showConfig}
            onConfigOpenChange={setShowConfig}
            addTicketOpen={showAddTicket}
            onAddTicketOpenChange={setShowAddTicket}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {boards.length === 0 ? 'Vytvořte nástěnku pro začátek' : 'Vyberte nástěnku'}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nová nástěnka</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Název nástěnky"
              value={newBoardName}
              onChange={e => setNewBoardName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Barva</label>
              <ColorPicker value={newBoardColor} onChange={setNewBoardColor} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Zrušit</Button>
            <Button onClick={handleCreate}>Vytvořit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editBoard !== null} onOpenChange={(open) => { if (!open) setEditBoard(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upravit nástěnku</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Název nástěnky"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEditSave()}
            />
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Barva</label>
              <ColorPicker value={editColor} onChange={setEditColor} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBoard(null)}>Zrušit</Button>
            <Button onClick={handleEditSave}>Uložit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportDialog open={showImport} onOpenChange={setShowImport} />
    </>
  );
}
