import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { KanbanView } from '@/components/kanban/KanbanView';
import { useKanbanBoards, useCreateBoard, useDeleteBoard } from '@/api/kanban';
import { useUiStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Download, Plus, Trash2 } from 'lucide-react';
import { ImportDialog } from '@/components/tickets/ImportDialog';
import { toast } from 'sonner';

export function KanbanPage() {
  const { data: boards = [] } = useKanbanBoards();
  const createBoard = useCreateBoard();
  const deleteBoard = useDeleteBoard();
  const selectedBoardId = useUiStore(s => s.selectedBoardId);
  const selectBoard = useUiStore(s => s.selectBoard);
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');

  // Auto-select first board
  if (!selectedBoardId && boards.length > 0) {
    selectBoard(boards[0].id);
  }

  const handleCreate = async () => {
    if (!newBoardName.trim()) return;
    const board = await createBoard.mutateAsync({ name: newBoardName.trim() });
    selectBoard(board.id);
    setNewBoardName('');
    setShowCreate(false);
    toast.success('Nástěnka vytvořena');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Opravdu smazat nástěnku?')) return;
    await deleteBoard.mutateAsync(id);
    if (selectedBoardId === id) selectBoard(null);
    toast.success('Nástěnka smazána');
  };

  return (
    <>
      <Header title="Kanban" actions={
        <Button size="sm" variant="outline" onClick={() => setShowImport(true)}>
          <Download className="h-4 w-4 mr-1" /> Import
        </Button>
      } />
      <div className="flex items-center gap-2 px-4 py-2 shadow-[0_1px_0_0_var(--color-border)] overflow-x-auto">
        {boards.map((board: any) => (
          <div key={board.id} className="flex items-center gap-1">
            <Button
              variant={selectedBoardId === board.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => selectBoard(board.id)}
            >
              {board.name}
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(board.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-3 w-3 mr-1" /> Nová nástěnka
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        {selectedBoardId ? (
          <KanbanView boardId={selectedBoardId} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {boards.length === 0 ? 'Vytvořte nástěnku pro začátek' : 'Vyberte nástěnku'}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nová nástěnka</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Název nástěnky"
              value={newBoardName}
              onChange={e => setNewBoardName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Zrušit</Button>
            <Button onClick={handleCreate}>Vytvořit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ImportDialog open={showImport} onOpenChange={setShowImport} />
    </>
  );
}
