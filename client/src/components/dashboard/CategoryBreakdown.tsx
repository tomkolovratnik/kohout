import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { DashboardStats } from '@kohout/shared';

interface CategoryBreakdownProps {
  stats: DashboardStats;
}

const STATUS_COLORS: Record<string, string> = {
  open: '#0ea5e9',
  in_progress: '#f59e0b',
  resolved: '#10b981',
  closed: '#94a3b8',
  unknown: '#cbd5e1',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#10b981',
  none: '#cbd5e1',
};

export function CategoryBreakdown({ stats }: CategoryBreakdownProps) {
  const statusData = Object.entries(stats.by_status || {}).map(([name, value]) => ({ name, value }));
  const priorityData = Object.entries(stats.by_priority || {}).map(([name, value]) => ({ name, value }));
  const categoryData = (stats.by_category || []).map(c => ({
    name: c.category.name,
    count: c.count,
    color: c.category.color,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dle statusu</CardTitle>
        </CardHeader>
        <CardContent>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#d1d5db'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Žádná data</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dle priority</CardTitle>
        </CardHeader>
        <CardContent>
          {priorityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {priorityData.map((entry) => (
                    <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] || '#d1d5db'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Žádná data</p>
          )}
        </CardContent>
      </Card>

      {categoryData.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Dle kategorií</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" className="[&>line]:stroke-border" />
                <XAxis dataKey="name" fontSize={12} fontFamily="var(--font-body)" />
                <YAxis fontSize={12} fontFamily="var(--font-body)" />
                <Tooltip />
                <Bar dataKey="count" name="Počet">
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
