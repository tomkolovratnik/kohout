import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useFiltersStore } from '@/stores/filters-store';
import { useDeleteFolder } from '@/api/folders';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Trash2, Pencil, Plus } from 'lucide-react';
import { PRESET_ICONS } from './CreateFolderDialog';
import { EditFolderDialog } from './EditFolderDialog';
import { toast } from 'sonner';
import type { FolderTreeNode } from '@kohout/shared';

interface FolderTreeItemProps {
  node: FolderTreeNode;
  depth: number;
  expandedIds: Set<number>;
  toggleExpand: (id: number) => void;
  onCreateSubfolder: (parentId: number) => void;
  isDropTarget?: boolean;
}

export function FolderTreeItem({ node, depth, expandedIds, toggleExpand, onCreateSubfolder, isDropTarget }: FolderTreeItemProps) {
  const folderId = useFiltersStore(s => s.folder_id);
  const setFilter = useFiltersStore(s => s.setFilter);
  const deleteFolder = useDeleteFolder();
  const [showEdit, setShowEdit] = useState(false);

  const isActive = folderId === String(node.id);
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: `folder-${node.id}`,
    data: { type: 'folder', folder: node },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleClick = () => {
    setFilter('folder_id', String(node.id));
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Smazat složku "${node.name}" a všechny podsložky?`)) return;
    deleteFolder.mutate(node.id, {
      onSuccess: () => {
        toast.success('Složka smazána');
        if (isActive) setFilter('folder_id', '');
      },
    });
  };

  const folderColor = node.color || undefined;
  const CustomIcon = node.icon ? PRESET_ICONS.find(i => i.name === node.icon)?.icon : null;

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          'group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-150',
          isActive && 'bg-accent ring-1 ring-primary/20',
          !isActive && 'hover:bg-accent/40',
          (isOver || isDropTarget) && !isActive && 'bg-primary/10 ring-2 ring-primary/30',
          isDragging && 'opacity-50',
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        {...attributes}
        {...listeners}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
            className="shrink-0 p-0.5 rounded hover:bg-accent"
          >
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        ) : (
          <span className="w-[18px] shrink-0" />
        )}

        {CustomIcon ? (
          <CustomIcon className="h-4 w-4 shrink-0" style={folderColor ? { color: folderColor } : undefined} />
        ) : (isActive || isExpanded) ? (
          <FolderOpen className="h-4 w-4 shrink-0" style={folderColor ? { color: folderColor } : undefined} />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" style={folderColor ? { color: folderColor } : undefined} />
        )}

        <span className="text-sm truncate flex-1 min-w-0">{node.name}</span>
        {node.total_ticket_count > 0 && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0 shrink-0">{node.total_ticket_count}</Badge>
        )}
        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          <button onClick={(e) => { e.stopPropagation(); setShowEdit(true); }} className="p-0.5 rounded hover:bg-accent" title="Upravit">
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onCreateSubfolder(node.id); }} className="p-0.5 rounded hover:bg-accent" title="Nová podsložka">
            <Plus className="h-3 w-3 text-muted-foreground" />
          </button>
          <button onClick={handleDelete} className="p-0.5 rounded hover:bg-accent" title="Smazat">
            <Trash2 className="h-3 w-3 text-destructive" />
          </button>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <FolderTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              onCreateSubfolder={onCreateSubfolder}
            />
          ))}
        </div>
      )}

      <EditFolderDialog open={showEdit} onOpenChange={setShowEdit} folder={node} />
    </div>
  );
}
