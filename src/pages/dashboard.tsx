import { useState, useEffect } from 'react';
import { ShoppingBag, Clock, CheckCircle, UtensilsCrossed } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function VendorDashboard() {
  // 1. Adjusted state for Vendor-relevant metrics
  const [stats, setStats] = useState({
    totalSales: 0,
    pendingOrders: 0,
    completedOrders: 0,
    activeItems: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendorStats = async () => {
      try {
        // Using vendorToken as per your logic
        const token = localStorage.getItem('vendorToken');

        const response = await fetch('http://localhost:3000/api/vendorDashboard', {
          method: 'GET',
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
    };

    fetchVendorStats();
  }, []);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Stall Overview</h1>
        <p className="text-muted-foreground">Manage your orders and track your performance.</p>
      </header>

      {/* Vendor Stats Grid */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Overall Sales" value={loading ? '...' : `₱${stats.totalSales.toLocaleString()}`} icon={<ShoppingBag className="text-green-600" />} />
        <StatCard title="Pending Orders" value={loading ? '...' : stats.pendingOrders.toString()} icon={<Clock className="text-orange-500" />} />
        <StatCard title="Completed Orders" value={loading ? '...' : stats.completedOrders.toString()} icon={<CheckCircle className="text-blue-500" />} />
        <StatCard title="Active Menu Items" value={loading ? '...' : stats.activeItems.toString()} icon={<UtensilsCrossed className="text-gray-500" />} />
      </div>

      {/* Main Operational Area */}
      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Incoming Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground flex h-[300px] items-center justify-center rounded-md border-2 border-dashed">Real-time order queue will be displayed here.</div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground flex h-[300px] items-center justify-center rounded-md border-2 border-dashed">Popular items chart.</div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
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
