import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useCreateFolder, useFolderTree } from '@/api/folders';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Folder, Archive, Briefcase, Bug, Code, FileText, Flag, Heart,
  Lightbulb, Rocket, Shield, Star, Zap, BookOpen, Users,
  type LucideIcon,
} from 'lucide-react';
import type { FolderTreeNode } from '@kohout/shared';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#78716c', '#64748b', '#475569',
];

const PRESET_ICONS: { name: string; icon: LucideIcon; label: string }[] = [
  { name: 'folder', icon: Folder, label: 'Složka' },
  { name: 'star', icon: Star, label: 'Hvězda' },
  { name: 'flag', icon: Flag, label: 'Vlajka' },
  { name: 'bug', icon: Bug, label: 'Bug' },
  { name: 'rocket', icon: Rocket, label: 'Raketa' },
  { name: 'lightbulb', icon: Lightbulb, label: 'Nápad' },
  { name: 'code', icon: Code, label: 'Kód' },
  { name: 'file-text', icon: FileText, label: 'Dokument' },
  { name: 'briefcase', icon: Briefcase, label: 'Práce' },
  { name: 'shield', icon: Shield, label: 'Bezpečnost' },
  { name: 'heart', icon: Heart, label: 'Srdce' },
  { name: 'zap', icon: Zap, label: 'Blesk' },
  { name: 'archive', icon: Archive, label: 'Archiv' },
  { name: 'book-open', icon: BookOpen, label: 'Kniha' },
  { name: 'users', icon: Users, label: 'Tým' },
];

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultParentId?: number | null;
}

function flattenTree(nodes: FolderTreeNode[], depth = 0): { id: number; name: string; depth: number }[] {
  const result: { id: number; name: string; depth: number }[] = [];
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, depth });
    result.push(...flattenTree(node.children, depth + 1));
  }
  return result;
}

export function CreateFolderDialog({ open, onOpenChange, defaultParentId }: CreateFolderDialogProps) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [color, setColor] = useState('#6366f1');
  const [icon, setIcon] = useState('folder');
  const createFolder = useCreateFolder();
  const { data: treeData } = useFolderTree();

  useEffect(() => {
    if (open) {
      setName('');
      setParentId(defaultParentId ? String(defaultParentId) : '');
      setColor('#6366f1');
      setIcon('folder');
    }
  }, [open, defaultParentId]);

  const flatFolders = treeData ? flattenTree(treeData.tree) : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createFolder.mutate({
      name: name.trim(),
      parent_id: parentId ? Number(parentId) : null,
      color,
      icon,
    }, {
      onSuccess: () => {
        toast.success('Složka vytvořena');
        onOpenChange(false);
      },
      onError: (err: any) => toast.error(err.message),
    });
  };

  const SelectedIcon = PRESET_ICONS.find(i => i.name === icon)?.icon || Folder;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nová složka</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Preview */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 ring-1 ring-border/20">
            <SelectedIcon className="h-5 w-5 shrink-0" style={{ color }} />
            <span className="text-sm font-medium truncate">{name || 'Název složky'}</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Název</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Název složky" autoFocus />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nadřazená složka</label>
            <Select value={parentId} onChange={e => setParentId(e.target.value)}>
              <option value="">-- Žádná (root) --</option>
              {flatFolders.map(f => (
                <option key={f.id} value={f.id}>{'  '.repeat(f.depth) + f.name}</option>
              ))}
            </Select>
          </div>

          {/* Color swatches */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Barva</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-7 w-7 rounded-md transition-all duration-150',
                    color === c ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110' : 'ring-1 ring-black/10 hover:scale-110'
                  )}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Icon picker */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Ikona</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_ICONS.map(({ name: iconName, icon: IconComponent, label }) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(iconName)}
                  className={cn(
                    'h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-150',
                    icon === iconName
                      ? 'bg-primary/15 ring-2 ring-primary/40 scale-110'
                      : 'ring-1 ring-border/40 bg-card hover:bg-accent/60 hover:scale-105'
                  )}
                  title={label}
                >
                  <IconComponent className="h-4 w-4" style={icon === iconName ? { color } : undefined} />
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Zrušit</Button>
            <Button type="submit" disabled={!name.trim() || createFolder.isPending}>Vytvořit</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { PRESET_COLORS, PRESET_ICONS };
