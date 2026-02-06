import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useProviders } from '@/api/providers';
import { useImportTicket } from '@/api/tickets';
import { useTags } from '@/api/tags';
import { useCategories } from '@/api/categories';
import { useFolderTree } from '@/api/folders';
import { apiFetch } from '@/api/client';
import { toast } from 'sonner';
import { Download, X } from 'lucide-react';
import type { FolderTreeNode } from '@kohout/shared';

function flattenTree(nodes: FolderTreeNode[], depth = 0): { id: number; name: string; depth: number }[] {
  const result: { id: number; name: string; depth: number }[] = [];
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, depth });
    result.push(...flattenTree(node.children, depth + 1));
  }
  return result;
}

const LAST_PROVIDER_KEY = 'kohout-last-provider';

function getInitialProvider(providers: any[]): string {
  const saved = localStorage.getItem(LAST_PROVIDER_KEY);
  if (saved && providers.some(p => String(p.id) === saved)) return saved;
  return '';
}

function parseTicketIds(input: string): string[] {
  return input
    .split(/[,;]/)
    .map(id => id.trim())
    .filter(Boolean);
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const qc = useQueryClient();
  const { data: providers = [] } = useProviders();
  const importTicket = useImportTicket();
  const { data: tags = [] } = useTags();
  const { data: categories = [] } = useCategories();
  const { data: treeData } = useFolderTree();

  const [providerId, setProviderId] = useState('');
  const [externalId, setExternalId] = useState('');
  const [folderId, setFolderId] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Initialize provider from localStorage when providers load
  useEffect(() => {
    if (open && providers.length > 0 && !providerId) {
      setProviderId(getInitialProvider(providers));
    }
  }, [open, providers]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setExternalId('');
      setFolderId('');
      setSelectedTagIds([]);
      setSelectedCategoryIds([]);
      setImporting(false);
      setProgress({ current: 0, total: 0 });
    }
  }, [open]);

  const availableTags = tags.filter((t: any) => !selectedTagIds.includes(t.id));
  const availableCategories = categories.filter((c: any) => !selectedCategoryIds.includes(c.id));
  const flatFolders = treeData ? flattenTree(treeData.tree) : [];

  const handleImport = async () => {
    if (!providerId || !externalId.trim()) return;

    const ticketIds = parseTicketIds(externalId);
    if (ticketIds.length === 0) return;

    setImporting(true);
    setProgress({ current: 0, total: ticketIds.length });

    let successCount = 0;
    let failCount = 0;

    for (const id of ticketIds) {
      setProgress(prev => ({ ...prev, current: prev.current + 1 }));
      try {
        const ticket = await importTicket.mutateAsync({
          provider_id: Number(providerId),
          external_id: id,
        });

        // Assign tags and categories directly via apiFetch to avoid repeated cache invalidation
        for (const tagId of selectedTagIds) {
          try {
            await apiFetch(`/tags/tickets/${ticket.id}`, {
              method: 'POST',
              body: JSON.stringify({ tag_id: tagId }),
            });
          } catch {}
        }
        for (const categoryId of selectedCategoryIds) {
          try {
            await apiFetch(`/categories/tickets/${ticket.id}`, {
              method: 'POST',
              body: JSON.stringify({ category_id: categoryId }),
            });
          } catch {}
        }
        if (folderId) {
          try {
            await apiFetch(`/tickets/${ticket.id}/folder`, {
              method: 'PATCH',
              body: JSON.stringify({ folder_id: Number(folderId) }),
            });
          } catch {}
        }

        successCount++;
      } catch {
        failCount++;
      }
    }

    // Invalidate caches once at the end
    qc.invalidateQueries({ queryKey: ['tickets'] });
    if (selectedTagIds.length > 0) qc.invalidateQueries({ queryKey: ['ticket-tags'] });
    if (selectedCategoryIds.length > 0) qc.invalidateQueries({ queryKey: ['ticket-categories'] });
    if (folderId) qc.invalidateQueries({ queryKey: ['folder-tree'] });

    // Summary toast
    if (failCount === 0) {
      toast.success(`Importováno ${successCount} tiketů`);
    } else {
      toast.warning(`Importováno ${successCount} z ${successCount + failCount} tiketů (${failCount} selhalo)`);
    }

    // Save last used provider
    localStorage.setItem(LAST_PROVIDER_KEY, providerId);

    setImporting(false);
    setExternalId('');
    onOpenChange(false);
  };

  const ticketIds = parseTicketIds(externalId);
  const hasValidInput = providerId && ticketIds.length > 0;

  return (
    <Dialog open={open} onOpenChange={importing ? () => {} : onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import tiketů</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Provider */}
          <div>
            <Label>Provider</Label>
            <Select value={providerId} onChange={e => setProviderId(e.target.value)} disabled={importing}>
              <option value="">Vyberte...</option>
              {providers.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
              ))}
            </Select>
          </div>

          {/* Ticket IDs */}
          <div>
            <Label>ID tiketů</Label>
            <Input
              value={externalId}
              onChange={e => setExternalId(e.target.value)}
              placeholder="PROJ-123, PROJ-456; ADO-789"
              onKeyDown={e => e.key === 'Enter' && !importing && handleImport()}
              disabled={importing}
            />
            <p className="text-xs text-muted-foreground mt-1">Více oddělte čárkou nebo středníkem</p>
          </div>

          {/* Folder */}
          <div>
            <Label>Složka</Label>
            <Select value={folderId} onChange={e => setFolderId(e.target.value)} disabled={importing}>
              <option value="">-- Bez složky --</option>
              {flatFolders.map(f => (
                <option key={f.id} value={f.id}>{'\u00A0\u00A0'.repeat(f.depth) + f.name}</option>
              ))}
            </Select>
          </div>

          {/* Categories */}
          <div>
            <Label>Kategorie</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {selectedCategoryIds.map(id => {
                const cat = categories.find((c: any) => c.id === id);
                if (!cat) return null;
                return (
                  <Badge key={cat.id} style={{ backgroundColor: cat.color + '20', color: cat.color, borderColor: cat.color }}>
                    {cat.name}
                    <button className="ml-1" onClick={() => setSelectedCategoryIds(prev => prev.filter(cid => cid !== id))} disabled={importing}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
              {availableCategories.length > 0 && (
                <Select
                  className="h-7 text-xs w-32"
                  disabled={importing}
                  onChange={e => {
                    const val = Number(e.target.value);
                    if (val) {
                      setSelectedCategoryIds(prev => [...prev, val]);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">+ Přidat</option>
                  {availableCategories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label>Tagy</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {selectedTagIds.map(id => {
                const tag = tags.find((t: any) => t.id === id);
                if (!tag) return null;
                return (
                  <Badge key={tag.id} style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color }}>
                    {tag.name}
                    <button className="ml-1" onClick={() => setSelectedTagIds(prev => prev.filter(tid => tid !== id))} disabled={importing}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
              {availableTags.length > 0 && (
                <Select
                  className="h-7 text-xs w-32"
                  disabled={importing}
                  onChange={e => {
                    const val = Number(e.target.value);
                    if (val) {
                      setSelectedTagIds(prev => [...prev, val]);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">+ Přidat</option>
                  {availableTags.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>Zrušit</Button>
          <Button onClick={handleImport} disabled={importing || !hasValidInput}>
            <Download className="h-4 w-4 mr-1" />
            {importing
              ? `Importuji ${progress.current}/${progress.total}...`
              : 'Importovat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
