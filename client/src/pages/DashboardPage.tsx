import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { PinnedTickets } from '@/components/dashboard/PinnedTickets';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { ImportDialog } from '@/components/tickets/ImportDialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useRecentActivity } from '@/api/dashboard';

export function DashboardPage() {
  const { data: activities = [] } = useRecentActivity();
  const [showImport, setShowImport] = useState(false);

  return (
    <>
      <Header title="Dashboard" actions={
        <Button size="sm" variant="outline" onClick={() => setShowImport(true)}>
          <Download className="h-4 w-4 mr-1" /> Import
        </Button>
      } />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <PinnedTickets />
        <RecentActivity activities={activities} />
      </div>
      <ImportDialog open={showImport} onOpenChange={setShowImport} />
    </>
  );
}
