import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUpdateFolder } from '@/api/folders';
import { PRESET_ICONS, PRESET_COLORS } from './CreateFolderDialog';
import { cn } from '@/lib/utils';
import { Folder } from 'lucide-react';
import { toast } from 'sonner';
import type { FolderTreeNode } from '@kohout/shared';

interface EditFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: FolderTreeNode;
}

export function EditFolderDialog({ open, onOpenChange, folder }: EditFolderDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [icon, setIcon] = useState('folder');
  const updateFolder = useUpdateFolder();

  useEffect(() => {
    if (open) {
      setName(folder.name);
      setColor(folder.color || '#6366f1');
      setIcon(folder.icon || 'folder');
    }
  }, [open, folder]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateFolder.mutate({
      id: folder.id,
      name: name.trim(),
      color,
      icon,
    }, {
      onSuccess: () => {
        toast.success('Složka upravena');
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
          <DialogTitle>Upravit složku</DialogTitle>
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
            <Button type="submit" disabled={!name.trim() || updateFolder.isPending}>Uložit</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
