import { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, Clock, CheckCircle, UtensilsCrossed, History, RefreshCw } from 'lucide-react';
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
    const handleRefresh = () => fetchVendorStats();
    window.addEventListener('refresh-orders', handleRefresh);
    return () => window.removeEventListener('refresh-orders', handleRefresh);
  }, [fetchVendorStats]);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Stat Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          icon={<ShoppingBag className="h-5 w-5" style={{ color: '#1a5c2a' }} />}
        />
        <StatCard title="Pending Orders" value={loading ? '...' : stats.pendingOrders.toString()} icon={<Clock className="h-5 w-5 text-orange-500" />} />
        <StatCard title="Completed Orders Today" value={loading ? '...' : stats.completedOrders.toString()} icon={<CheckCircle className="h-5 w-5" style={{ color: '#1a5c2a' }} />} />
        <StatCard title="Available Menu Items" value={loading ? '...' : stats.activeItems.toString()} icon={<UtensilsCrossed className="h-5 w-5" style={{ color: '#c9a84c' }} />} />
      </div>

      {/* Bottom Cards*/}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        {/* Recent Activity */}
        <Card className="col-span-1 flex flex-col shadow-sm lg:col-span-4" style={{ border: '1.5px solid #c9a84c', backgroundColor: '#ffffff' }}>
          <CardHeader>
            <CardTitle style={{ color: '#1a5c2a' }}>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[325px] flex-1 overflow-y-auto p-0">
            {loading ? (
              <div className="flex h-[200px] items-center justify-center gap-2 text-sm" style={{ color: '#6b7280' }}>
                <RefreshCw className="h-4 w-4 animate-spin" style={{ color: '#1a5c2a' }} />
                Loading activity...
              </div>
            ) : stats.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="divide-y" style={{ borderColor: '#e8f0e9' }}>
                {stats.recentActivity.map((log, i) => (
                  <div key={`${log.id}-${i}`} className="flex items-start gap-4 p-4">
                    <div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${log.type === 'new_order' ? 'animate-pulse bg-orange-500' : 'bg-blue-500'}`} />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-semibold">{log.message}</p>
                      <div className="text-muted-foreground flex items-center gap-2 text-xs">
                        <Clock className="h-3 w-3" />
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-sm italic" style={{ color: '#9ca3af' }}>
                <History className="h-8 w-8 opacity-20" />
                <p>No recent activity recorded.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Selling Items */}
        <Card className="col-span-1 flex flex-col shadow-sm lg:col-span-3" style={{ border: '1.5px solid #c9a84c', backgroundColor: '#ffffff' }}>
          <CardHeader>
            <CardTitle style={{ color: '#1a5c2a' }}>Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="flex h-[200px] items-center justify-center gap-2 text-sm" style={{ color: '#6b7280' }}>
                <RefreshCw className="h-4 w-4 animate-spin" style={{ color: '#1a5c2a' }} />
                Loading stats...
              </div>
            ) : stats.topSellingItems && stats.topSellingItems.length > 0 ? (
              <div className="space-y-5">
                {stats.topSellingItems.map((item, index) => {
                  const maxQty = stats.topSellingItems[0].total_qty;
                  const percentage = (item.total_qty / maxQty) * 100;
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{item.item_name}</span>
                        <span className="text-muted-foreground font-medium">{item.total_qty} units</span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full" style={{ backgroundColor: '#e8f0e9' }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: '#1a5c2a' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center rounded-md border-2 border-dashed text-sm" style={{ borderColor: '#b8d9be', color: '#9ca3af', backgroundColor: '#f5fbf6' }}>
                No sales recorded yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="shadow-sm transition-shadow hover:shadow-md" style={{ border: '1.5px solid #c9a84c', backgroundColor: '#ffffff' }}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium" style={{ color: '#14491f' }}>
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="pt-3">
        <div className="text-2xl font-bold" style={{ color: '#1a5c2a' }}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
