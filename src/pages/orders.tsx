import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Search, RefreshCw, Clock, CheckCircle2, PackageCheck, XCircle, Hash } from 'lucide-react';

interface OrderItem {
  item_id: number;
  item_name_snapshot: string;
  quantity: number;
  price_at_order: number;
}

interface Order {
  order_id: number;
  full_name: string;
  department: string;
  status: 'pending' | 'preparing' | 'ready' | 'picked_up' | 'cancelled';
  order_time: string;
  order_remarks?: string;
  items: OrderItem[];
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState('');

  const stallId = localStorage.getItem('stallId');

  const apiCall = useCallback(async (endpoint: string, options: RequestInit) => {
    const token = localStorage.getItem('vendorToken');
    if (!token) throw new Error('Authentication token not found.');

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(`http://localhost:3000/api${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'An error occurred');
    return data;
  }, []);

  const fetchOrders = useCallback(
    async (isManual = false) => {
      if (!stallId) return;
      setLoading(true);
      try {
        const data = await apiCall(`/vendorOrders`, { method: 'GET' });
        setOrders(Array.isArray(data) ? data : []);
        if (isManual) toast.success('Orders refreshed');
      } catch (err: any) {
        toast.error(err.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    },
    [stallId, apiCall]
  );

  useEffect(() => {
    fetchOrders();
    // Refresh every 60 seconds for live updates
    const interval = setInterval(() => fetchOrders(), 60000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const updateStatus = async (orderId: number, status: string) => {
    const promise = apiCall(`/updateOrderStatus`, {
      method: 'PATCH',
      // Update this in your frontend updateStatus function
      body: JSON.stringify({ orderId, status }), // Property is "orderId"
    });

    toast.promise(promise, {
      loading: 'Updating status...',
      success: (res) => {
        // Optimistic update
        setOrders((prev) => prev.map((o) => (o.order_id === orderId ? { ...o, status: status as any } : o)));
        return res.message;
      },
      error: (err) => err.message,
    });
  };

  const filteredOrders = useMemo(
    () => orders.filter((order) => [order.full_name, String(order.order_id), order.department].some((field) => field?.toLowerCase().includes(orderSearch.toLowerCase()))),
    [orders, orderSearch]
  );

  const activeOrders = filteredOrders.filter((o) => ['pending', 'preparing', 'ready'].includes(o.status));
  const completedOrders = filteredOrders.filter((o) => ['picked_up', 'cancelled'].includes(o.status));

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      preparing: 'bg-blue-100 text-blue-700 border-blue-200',
      ready: 'bg-green-100 text-green-700 border-green-200',
      picked_up: 'bg-slate-100 text-slate-700 border-slate-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200',
    };
    return (
      <Badge variant="outline" className={variants[status]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col space-y-6 overflow-hidden">
      <header className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Monitor and update real-time orders.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
            <Input placeholder="Search by name or ID..." className="pl-10" value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="icon" onClick={() => fetchOrders(true)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      <Tabs defaultValue="active" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mb-4 w-fit">
          <TabsTrigger value="active">Active ({activeOrders.length})</TabsTrigger>
          <TabsTrigger value="history">History ({completedOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="custom-scrollbar flex-1 overflow-y-auto">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeOrders.map((order) => (
              <Card key={order.order_id} className="flex flex-col border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Hash className="text-muted-foreground h-3 w-3" />
                        <span className="font-mono text-xs font-bold">{order.order_id}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <CardTitle className="text-lg">{order.full_name}</CardTitle>
                      <CardDescription>{order.department}</CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-4">
                  <div className="bg-muted/40 space-y-2 rounded-lg p-3">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>
                          <span className="font-bold">{item.quantity}x</span> {item.item_name_snapshot}
                        </span>
                        <span className="text-muted-foreground">₱{item.price_at_order}</span>
                      </div>
                    ))}
                  </div>
                  {order.order_remarks && (
                    <div className="rounded border border-orange-100 bg-orange-50 p-2 text-xs text-orange-800">
                      <strong>Note:</strong> {order.order_remarks}
                    </div>
                  )}
                </CardContent>

                <CardContent className="flex flex-col gap-2 pt-0">
                  <div className="grid grid-cols-2 gap-2">
                    {order.status === 'pending' && (
                      <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => updateStatus(order.order_id, 'preparing')}>
                        <Clock className="mr-2 h-4 w-4" /> Prepare
                      </Button>
                    )}
                    {order.status === 'preparing' && (
                      <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => updateStatus(order.order_id, 'ready')}>
                        <PackageCheck className="mr-2 h-4 w-4" /> Ready
                      </Button>
                    )}
                    {order.status === 'ready' && (
                      <Button variant="outline" className="w-full border-green-600 text-green-600 hover:bg-green-50" onClick={() => updateStatus(order.order_id, 'picked_up')}>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Picked Up
                      </Button>
                    )}
                    {(order.status === 'pending' || order.status === 'preparing') && (
                      <Button variant="ghost" className="text-destructive hover:bg-red-50" onClick={() => updateStatus(order.order_id, 'cancelled')}>
                        <XCircle className="mr-2 h-4 w-4" /> Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="custom-scrollbar flex-1 overflow-y-auto">
          {/* Similar layout as above but with lower opacity/disabled buttons */}
          <div className="grid gap-4 opacity-75 sm:grid-cols-2 lg:grid-cols-3">
            {completedOrders.map((order) => (
              <Card key={order.order_id} className="bg-muted/20 grayscale-[0.5]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold">#{order.order_id}</span>
                    {getStatusBadge(order.status)}
                  </div>
                  <CardTitle className="text-base">{order.full_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-xs italic">Completed: {new Date(order.order_time).toLocaleString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
