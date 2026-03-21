import { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, Clock, CheckCircle, UtensilsCrossed, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ActivityLog {
  id: number;
  message: string;
  type: 'new_order' | 'status_change';
  created_at: string;
}

export default function VendorDashboard() {
  const [stats, setStats] = useState({
    totalSales: 0,
    pendingOrders: 0,
    completedOrders: 0,
    activeItems: 0,
    topSellingItems: [] as { item_name: string; total_qty: number }[],
    recentActivity: [] as ActivityLog[],
  });
  const [loading, setLoading] = useState(true);

  const fetchVendorStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('vendorToken');
      const response = await fetch('http://localhost:3000/api/vendorDashboard', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401 || response.status === 403) {
        console.error('Unauthorized. Please log in as a vendor.');
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading vendor stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendorStats();

    // Listen for global refresh from VendorLayout or other components
    const handleRefresh = () => fetchVendorStats();
    window.addEventListener('refresh-orders', handleRefresh);
    return () => window.removeEventListener('refresh-orders', handleRefresh);
  }, [fetchVendorStats]);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Stall Overview</h1>
      </header>

      {/* Metric Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sales Today"
          value={
            loading
              ? '...'
              : `₱${Number(stats.totalSales).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
          }
          icon={<ShoppingBag className="text-blue-500" />}
        />{' '}
        <StatCard title="Pending Orders" value={loading ? '...' : stats.pendingOrders.toString()} icon={<Clock className="text-orange-500" />} />
        <StatCard title="Completed Orders Today" value={loading ? '...' : stats.completedOrders.toString()} icon={<CheckCircle className="text-green-500" />} />
        <StatCard title="Available Menu Items" value={loading ? '...' : stats.activeItems.toString()} icon={<UtensilsCrossed className="text-gray-500" />} />
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        {/* RECENT ACTIVITY LOG */}
        <Card className="col-span-4 flex flex-col border-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">Recent Activity</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="max-h-[325px] flex-1 overflow-y-auto p-0">
            {loading ? (
              <div className="flex h-[325px] items-center justify-center">Loading activity...</div>
            ) : stats.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {stats.recentActivity.map((log, i) => (
                  <div key={`${log.id}-${i}`} className="flex items-start gap-4 p-4 hover:bg-slate-50/50">
                    <div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${log.type === 'new_order' ? 'animate-pulse bg-orange-500' : 'bg-blue-500'}`} />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-semibold">{log.message}</p>
                      <div className="text-muted-foreground flex items-center gap-2 text-xs">
                        <Clock className="h-3 w-3" />
                        {new Date(log.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground flex h-[350px] flex-col items-center justify-center gap-2 italic">
                <History className="h-8 w-8 opacity-20" />
                <p>No recent activity recorded.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* TOP SELLING ITEMS */}
        <Card className="col-span-3 flex flex-col border-2 shadow-sm">
          <CardHeader>
            <CardTitle>Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-[325px] items-center justify-center">Loading stats...</div>
            ) : stats.topSellingItems && stats.topSellingItems.length > 0 ? (
              <div className="space-y-6">
                {stats.topSellingItems.map((item, index) => {
                  const maxQty = stats.topSellingItems[0].total_qty;
                  const percentage = (item.total_qty / maxQty) * 100;

                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{item.item_name}</span>
                        <span className="text-muted-foreground font-medium">{item.total_qty} units</span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-green-500 transition-all duration-500" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-muted-foreground flex h-[300px] items-center justify-center rounded-md border-2 border-dashed text-sm">No sales recorded yet.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
