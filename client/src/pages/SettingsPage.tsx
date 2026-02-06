import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useProviders, useCreateProvider, useDeleteProvider, useTestConnection, useFetchMyTickets } from '@/api/providers';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/api/categories';
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '@/api/tags';
import { ColorPicker } from '@/components/ui/color-picker';
import { Plus, Trash2, CheckCircle, XCircle, Loader2, RefreshCw, Download, Info, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/api/client';

export function SettingsPage() {
  const { data: providers = [], isLoading } = useProviders();
  const createProvider = useCreateProvider();
  const deleteProvider = useDeleteProvider();
  const testConnection = useTestConnection();
  const [showAdd, setShowAdd] = useState(false);
  const [testResults, setTestResults] = useState<Record<number, boolean | null>>({});

  const [form, setForm] = useState({
    name: '',
    type: 'jira' as 'jira' | 'azure-devops',
    base_url: '',
    pat_token: '',
    username: '',
    organization: '',
    project: '',
    skip_ssl: false,
  });

  const handleCreate = async () => {
    try {
      const extra_config: Record<string, string> = {};
      if (form.type === 'azure-devops') {
        extra_config.organization = form.organization;
        extra_config.project = form.project;
      }
      if (form.skip_ssl) extra_config.skip_ssl = 'true';
      await createProvider.mutateAsync({
        name: form.name,
        type: form.type,
        base_url: form.base_url,
        pat_token: form.pat_token,
        username: form.username || undefined,
        extra_config,
      } as any);
      setShowAdd(false);
      setForm({ name: '', type: 'jira', base_url: '', pat_token: '', username: '', organization: '', project: '', skip_ssl: false });
      toast.success('Provider vytvořen');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleTest = async (id: number) => {
    setTestResults(r => ({ ...r, [id]: null }));
    try {
      const result = await testConnection.mutateAsync(id);
      setTestResults(r => ({ ...r, [id]: result.success }));
      if (result.success) {
        toast.success('Připojení úspěšné');
      } else {
        toast.error(result.error ? `Připojení selhalo: ${result.error}` : 'Připojení selhalo');
      }
    } catch (e: any) {
      setTestResults(r => ({ ...r, [id]: false }));
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Opravdu smazat providera? Všechny tikety budou odstraněny.')) return;
    await deleteProvider.mutateAsync(id);
    toast.success('Provider smazán');
  };

  return (
    <>
      <Header title="Nastavení" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold font-heading">Integrace</h3>
          <Button onClick={() => setShowAdd(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Přidat provider
          </Button>
        </div>

        {isLoading && <p className="text-muted-foreground">Načítání...</p>}

        <div className="grid gap-4">
          {providers.map((p: any) => (
            <Card key={p.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <Badge variant="secondary">{p.type}</Badge>
                    {testResults[p.id] === true && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {testResults[p.id] === false && <XCircle className="h-4 w-4 text-red-600" />}
                    {testResults[p.id] === null && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleTest(p.id)}>
                      Test
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{p.base_url}</p>
                {p.extra_config?.organization && (
                  <p className="text-sm text-muted-foreground">
                    Organizace: {p.extra_config.organization} / Projekt: {p.extra_config.project}
                  </p>
                )}
                {p.extra_config?.skip_ssl === 'true' && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">SSL ověření přeskočeno</p>
                )}
                <FetchMyTicketsSection providerId={p.id} providerType={p.type} />
              </CardContent>
            </Card>
          ))}
        </div>

        {providers.length === 0 && !isLoading && (
          <p className="text-muted-foreground text-center py-8">
            Zatím žádní provideři. Přidejte Jira nebo Azure DevOps instanci.
          </p>
        )}

        <Separator />

        <CategoriesSection />

        <Separator />

        <TagsSection />

        <Separator />

        <SyncSection />

        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Přidat integraci</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Název</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Můj Jira" />
              </div>
              <div>
                <Label>Typ</Label>
                <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}>
                  <option value="jira">Jira</option>
                  <option value="azure-devops">Azure DevOps</option>
                </Select>
              </div>
              <div>
                <Label>URL</Label>
                <Input value={form.base_url} onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))}
                  placeholder={form.type === 'jira' ? 'https://mycompany.atlassian.net' : 'https://dev.azure.com'} />
              </div>
              {form.type === 'jira' && (
                <div>
                  <Label>Email (username)</Label>
                  <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="user@company.com" />
                </div>
              )}
              <div>
                <Label>PAT Token</Label>
                <Input type="password" value={form.pat_token} onChange={e => setForm(f => ({ ...f, pat_token: e.target.value }))} />
              </div>
              {form.type === 'azure-devops' && (
                <>
                  <div>
                    <Label>Organizace</Label>
                    <Input value={form.organization} onChange={e => setForm(f => ({ ...f, organization: e.target.value }))} placeholder="my-org" />
                  </div>
                  <div>
                    <Label>Projekt</Label>
                    <Input value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))} placeholder="my-project" />
                  </div>
                </>
              )}
              <label className="flex items-center gap-2 text-sm cursor-pointer pt-2">
                <input type="checkbox" checked={form.skip_ssl} onChange={e => setForm(f => ({ ...f, skip_ssl: e.target.checked }))} className="rounded" />
                Přeskočit ověření SSL certifikátu
                <span className="text-muted-foreground">(firemní proxy)</span>
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Zrušit</Button>
              <Button onClick={handleCreate} disabled={createProvider.isPending}>
                {createProvider.isPending ? 'Ukládám...' : 'Uložit'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

function FetchMyTicketsSection({ providerId, providerType }: { providerId: number; providerType: string }) {
  const [assigned, setAssigned] = useState(true);
  const [watched, setWatched] = useState(false);
  const [participant, setParticipant] = useState(false);
  const [includeClosed, setIncludeClosed] = useState(false);
  const fetchMyTickets = useFetchMyTickets();

  const noneSelected = !assigned && !watched && !participant;

  const handleFetch = async () => {
    try {
      const result = await fetchMyTickets.mutateAsync({
        provider_id: providerId,
        assigned,
        watched,
        participant,
        include_closed: includeClosed,
      });
      toast.success(`Načteno: ${result.imported} nových, ${result.updated} aktualizovaných, ${result.failed} selhalo (z celkem ${result.total})`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const isAdo = providerType === 'azure-devops';

  return (
    <div className="mt-4 pt-4 border-t">
      <h4 className="text-sm font-medium mb-3">Načíst moje tikety</h4>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={assigned} onChange={e => setAssigned(e.target.checked)} className="rounded" />
          Přiřazené mně
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={watched} onChange={e => setWatched(e.target.checked)} className="rounded" />
          Sledované
          {isAdo && (
            <span className="inline-flex items-center" title="ADO nemá WIQL dotaz pro &quot;followed&quot; – jako náhradu používáme &quot;vytvořené mnou&quot;">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
          )}
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={participant} onChange={e => setParticipant(e.target.checked)} className="rounded" />
          Participant
        </label>
        <Separator className="my-2" />
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={includeClosed} onChange={e => setIncludeClosed(e.target.checked)} className="rounded" />
          Včetně uzavřených
        </label>
      </div>
      <Button
        size="sm"
        className="mt-3"
        onClick={handleFetch}
        disabled={noneSelected || fetchMyTickets.isPending}
      >
        {fetchMyTickets.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Načítám...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-1" />
            Načíst tikety
          </>
        )}
      </Button>
    </div>
  );
}

function CategoriesSection() {
  const { data: categories = [] } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createCategory.mutateAsync({ name: name.trim(), color });
    setName('');
    toast.success('Kategorie vytvořena');
  };

  const startEdit = (c: any) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditColor(c.color);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    if (!editName.trim() || editingId === null) return;
    try {
      await updateCategory.mutateAsync({ id: editingId, name: editName.trim(), color: editColor });
      toast.success('Kategorie aktualizována');
      setEditingId(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 font-heading">Kategorie</h3>
      <div className="space-y-2">
        {categories.map((c: any) => (
          <div key={c.id}>
            {editingId === c.id ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1" />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={saveEdit} disabled={updateCategory.isPending}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEdit}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <ColorPicker value={editColor} onChange={setEditColor} />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="text-sm flex-1">{c.name}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(c)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteCategory.mutate(c.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Input placeholder="Název kategorie" value={name} onChange={e => setName(e.target.value)} className="flex-1" />
        <Button size="sm" onClick={handleCreate}><Plus className="h-3 w-3" /></Button>
      </div>
      <ColorPicker value={color} onChange={setColor} className="mt-2" />
    </div>
  );
}

function TagsSection() {
  const { data: tags = [] } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#8b5cf6');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createTag.mutateAsync({ name: name.trim(), color });
    setName('');
    toast.success('Tag vytvořen');
  };

  const startEdit = (t: any) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditColor(t.color);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    if (!editName.trim() || editingId === null) return;
    try {
      await updateTag.mutateAsync({ id: editingId, name: editName.trim(), color: editColor });
      toast.success('Tag aktualizován');
      setEditingId(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 font-heading">Lokální tagy</h3>
      <div className="space-y-2">
        {tags.map((t: any) => (
          <div key={t.id}>
            {editingId === t.id ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1" />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={saveEdit} disabled={updateTag.isPending}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEdit}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <ColorPicker value={editColor} onChange={setEditColor} />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-sm flex-1">{t.name}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(t)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteTag.mutate(t.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Input placeholder="Název tagu" value={name} onChange={e => setName(e.target.value)} className="flex-1" />
        <Button size="sm" onClick={handleCreate}><Plus className="h-3 w-3" /></Button>
      </div>
      <ColorPicker value={color} onChange={setColor} className="mt-2" />
    </div>
  );
}

function SyncSection() {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await apiFetch<{ success: number; failed: number }>('/sync/refresh-all', { method: 'POST' });
      toast.success(`Synchronizace dokončena: ${result.success} úspěšných, ${result.failed} neúspěšných`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 font-heading">Synchronizace</h3>
      <p className="text-sm text-muted-foreground mb-3">
        Manuální obnovení všech tiketů ze zdrojových systémů. Automatická synchronizace probíhá každých 30 minut.
      </p>
      <Button onClick={handleSync} disabled={syncing}>
        <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Synchronizuji...' : 'Synchronizovat vše'}
      </Button>
    </div>
  );
}
