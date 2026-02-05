import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { PinnedTickets } from '@/components/dashboard/PinnedTickets';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { CategoryBreakdown } from '@/components/dashboard/CategoryBreakdown';
import { ImportDialog } from '@/components/tickets/ImportDialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useDashboardStats, useRecentActivity } from '@/api/dashboard';

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activities = [], isLoading: activityLoading } = useRecentActivity();
  const [showImport, setShowImport] = useState(false);

  return (
    <>
      <Header title="Dashboard" actions={
        <Button size="sm" variant="outline" onClick={() => setShowImport(true)}>
          <Download className="h-4 w-4 mr-1" /> Import
        </Button>
      } />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {statsLoading ? (
          <p className="text-muted-foreground">Načítání...</p>
        ) : stats ? (
          <>
            <StatsCards stats={stats} />
            <PinnedTickets />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <CategoryBreakdown stats={stats} />
              </div>
              <RecentActivity activities={activities} />
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">Žádná data. Importujte tikety pro zobrazení statistik.</p>
        )}
      </div>
      <ImportDialog open={showImport} onOpenChange={setShowImport} />
    </>
  );
}
