import { useState, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useFolderTree } from '@/api/folders';
import { useFiltersStore } from '@/stores/filters-store';
import { FolderTreeItem } from './FolderTreeItem';
import { CreateFolderDialog } from './CreateFolderDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FolderPlus, Inbox, Layers } from 'lucide-react';

export function FolderSidebar() {
  const { data: treeData } = useFolderTree();
  const folderId = useFiltersStore(s => s.folder_id);
  const setFilter = useFiltersStore(s => s.setFilter);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [createParentId, setCreateParentId] = useState<number | null>(null);

  const toggleExpand = useCallback((id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleCreateSubfolder = useCallback((parentId: number) => {
    setCreateParentId(parentId);
    setShowCreate(true);
  }, []);

  const handleCreateRoot = () => {
    setCreateParentId(null);
    setShowCreate(true);
  };

  // Droppable for "unfiled" virtual node
  const { setNodeRef: unfiledRef, isOver: isOverUnfiled } = useDroppable({
    id: 'unfiled',
    data: { type: 'virtual', action: 'unfiled' },
  });

  const tree = treeData?.tree || [];
  const unfiledCount = treeData?.unfiled_count ?? 0;
  const totalCount = tree.reduce((sum, n) => sum + n.total_ticket_count, 0) + unfiledCount;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 shadow-[0_1px_0_0_var(--color-border)]">
        <span className="text-sm font-semibold font-heading">Složky</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCreateRoot} title="Nová složka">
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1.5 space-y-0.5">
          {/* All tickets */}
          <button
            onClick={() => setFilter('folder_id', '')}
            className={cn(
              'w-full flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all duration-150',
              folderId === '' ? 'bg-accent ring-1 ring-primary/20' : 'hover:bg-accent/40'
            )}
          >
            <span className="w-[18px] shrink-0" />
            <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm flex-1 text-left">Všechny tikety</span>
            <Badge variant="secondary" className="text-xs px-1.5 py-0">{totalCount}</Badge>
          </button>

          {/* Unfiled */}
          <button
            ref={unfiledRef}
            onClick={() => setFilter('folder_id', 'unfiled')}
            className={cn(
              'w-full flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all duration-150',
              folderId === 'unfiled' ? 'bg-accent ring-1 ring-primary/20' : 'hover:bg-accent/40',
              isOverUnfiled && folderId !== 'unfiled' && 'bg-primary/10 ring-2 ring-primary/30',
            )}
          >
            <span className="w-[18px] shrink-0" />
            <Inbox className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm flex-1 text-left">Nezařazené</span>
            {unfiledCount > 0 && <Badge variant="secondary" className="text-xs px-1.5 py-0">{unfiledCount}</Badge>}
          </button>

          {/* Folder tree */}
          {tree.map(node => (
            <FolderTreeItem
              key={node.id}
              node={node}
              depth={0}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              onCreateSubfolder={handleCreateSubfolder}
            />
          ))}
        </div>
      </ScrollArea>

      <CreateFolderDialog open={showCreate} onOpenChange={setShowCreate} defaultParentId={createParentId} />
    </div>
  );
}
