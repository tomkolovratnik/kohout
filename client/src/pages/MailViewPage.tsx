import { useState, useCallback } from 'react';
import { DndContext, closestCorners, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Header } from '@/components/layout/Header';
import { FilterBar } from '@/components/tickets/FilterBar';
import { TicketList } from '@/components/tickets/TicketList';
import { TicketDetail } from '@/components/tickets/TicketDetail';
import { ImportDialog } from '@/components/tickets/ImportDialog';
import { FolderSidebar } from '@/components/folders/FolderSidebar';
import { ResizablePanelGroup } from '@/components/ui/resizable-panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAssignTicketFolder, useMoveFolder } from '@/api/folders';
import { Download, GripVertical, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function MailViewPage() {
  const [showImport, setShowImport] = useState(false);
  const [foldersPanelOpen, setFoldersPanelOpen] = useState(true);
  const [activeDrag, setActiveDrag] = useState<{ type: 'ticket' | 'folder'; id: number; label: string } | null>(null);

  const assignTicketFolder = useAssignTicketFolder();
  const moveFolder = useMoveFolder();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    const data = event.active.data.current;
    if (id.startsWith('ticket-')) {
      setActiveDrag({ type: 'ticket', id: Number(id.replace('ticket-', '')), label: data?.title || id });
    } else if (id.startsWith('folder-')) {
      setActiveDrag({ type: 'folder', id: Number(id.replace('folder-', '')), label: data?.folder?.name || id });
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith('ticket-') && overId.startsWith('folder-')) {
      const ticketId = Number(activeId.replace('ticket-', ''));
      const folderId = Number(overId.replace('folder-', ''));
      assignTicketFolder.mutate({ ticketId, folder_id: folderId }, {
        onError: (err: any) => toast.error(err.message),
      });
    } else if (activeId.startsWith('ticket-') && overId === 'unfiled') {
      const ticketId = Number(activeId.replace('ticket-', ''));
      assignTicketFolder.mutate({ ticketId, folder_id: null }, {
        onError: (err: any) => toast.error(err.message),
      });
    } else if (activeId.startsWith('folder-') && overId.startsWith('folder-')) {
      const folderId = Number(activeId.replace('folder-', ''));
      const newParentId = Number(overId.replace('folder-', ''));
      if (folderId === newParentId) return;
      moveFolder.mutate({ id: folderId, parent_id: newParentId }, {
        onError: (err: any) => toast.error(err.message),
      });
    } else if (activeId.startsWith('folder-') && overId === 'root') {
      const folderId = Number(activeId.replace('folder-', ''));
      moveFolder.mutate({ id: folderId, parent_id: null }, {
        onError: (err: any) => toast.error(err.message),
      });
    }
  }, [assignTicketFolder, moveFolder]);

  return (
    <>
      <Header title="Tikety" actions={
        <Button size="sm" variant="outline" onClick={() => setShowImport(true)}>
          <Download className="h-4 w-4 mr-1" /> Import
        </Button>
      } />
      <div className="flex-1 overflow-hidden">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <ResizablePanelGroup direction="horizontal" storageKey="kohout-tickets-split">
            <div className="h-full flex flex-col">
              <FilterBar foldersPanelOpen={foldersPanelOpen} onToggleFolders={() => setFoldersPanelOpen(p => !p)} />
              <div className="flex-1 overflow-hidden flex">
                {foldersPanelOpen && (
                  <div className="w-56 shrink-0 shadow-[1px_0_0_0_var(--color-border)] overflow-hidden">
                    <FolderSidebar />
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <TicketList />
                </div>
              </div>
            </div>
            <TicketDetail />
          </ResizablePanelGroup>

          <DragOverlay>
            {activeDrag?.type === 'ticket' && (
              <div className="bg-card rounded-lg ring-1 ring-primary/30 p-2 shadow-lg flex items-center gap-2 max-w-64">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{activeDrag.label}</span>
              </div>
            )}
            {activeDrag?.type === 'folder' && (
              <div className="bg-card rounded-lg ring-1 ring-primary/30 p-2 shadow-lg flex items-center gap-2 max-w-52">
                <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{activeDrag.label}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
      <ImportDialog open={showImport} onOpenChange={setShowImport} />
    </>
  );
}
