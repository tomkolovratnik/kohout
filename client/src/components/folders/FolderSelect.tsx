import { Select } from '@/components/ui/select';
import { useFolderTree, useAssignTicketFolder } from '@/api/folders';
import { toast } from 'sonner';
import type { FolderTreeNode } from '@kohout/shared';

interface FolderSelectProps {
  ticketId: number;
  currentFolderId: number | null;
}

function flattenTree(nodes: FolderTreeNode[], depth = 0): { id: number; name: string; depth: number }[] {
  const result: { id: number; name: string; depth: number }[] = [];
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, depth });
    result.push(...flattenTree(node.children, depth + 1));
  }
  return result;
}

export function FolderSelect({ ticketId, currentFolderId }: FolderSelectProps) {
  const { data: treeData } = useFolderTree();
  const assignFolder = useAssignTicketFolder();

  const flatFolders = treeData ? flattenTree(treeData.tree) : [];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const folderId = value === '' ? null : Number(value);
    assignFolder.mutate({ ticketId, folder_id: folderId }, {
      onError: (err: any) => toast.error(err.message),
    });
  };

  return (
    <Select
      value={currentFolderId !== null ? String(currentFolderId) : ''}
      onChange={handleChange}
      className="h-7 text-xs w-40"
    >
      <option value="">-- Bez složky --</option>
      {flatFolders.map(f => (
        <option key={f.id} value={f.id}>{'  '.repeat(f.depth) + f.name}</option>
      ))}
    </Select>
  );
}
