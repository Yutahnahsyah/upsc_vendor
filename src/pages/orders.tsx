import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Search, RefreshCw, Clock, CheckCircle2, PackageCheck, XCircle, Hash, ReceiptText } from 'lucide-react';

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
  completed_at?: string;
  cancelled_at?: string;
  is_paid: boolean;
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
    const response = await fetch(`http://localhost:3000/api${endpoint}`, { ...options, headers });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.message || 'An error occurred') as any;
      error.missing = data.missing;
      throw error;
    }
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
    const handleGlobalRefresh = () => fetchOrders();
    window.addEventListener('refresh-orders', handleGlobalRefresh);
    return () => window.removeEventListener('refresh-orders', handleGlobalRefresh);
  }, [fetchOrders]);

  const updateStatus = async (orderId: number, status: string) => {
    const promise = apiCall(`/updateOrderStatus`, {
      method: 'PATCH',
      body: JSON.stringify({ orderId, status }),
    });
    toast.promise(promise, {
      loading: `Transitioning to ${status}...`,
      success: (res) => {
        setOrders((prev) =>
          prev.map((o) => {
            if (o.order_id === orderId) {
              return {
                ...o,
                status: status as any,
                completed_at: status === 'picked_up' ? new Date().toISOString() : o.completed_at,
                cancelled_at: status === 'cancelled' ? new Date().toISOString() : o.cancelled_at,
                is_paid: status === 'picked_up' ? true : o.is_paid,
              };
            }
            return o;
          })
        );
        return res.message || `Order #${orderId} updated to ${status}`;
      },
      error: (err) => {
        if (err.missing && err.missing.length > 0) return `Insufficient stock: ${err.missing.join(', ')}`;
        return err.message || 'Failed to update order status.';
      },
    });
  };

  const calculateTotal = (items: OrderItem[]) => items.reduce((sum, item) => sum + Number(item.price_at_order) * item.quantity, 0);

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
      picked_up: 'bg-green-100 text-green-700 border-green-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200',
    };
    return (
      <Badge variant="outline" className={`text-[10px] font-bold uppercase ${variants[status]}`}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="flex h-[calc(100vh-66px)] flex-col p-4 md:p-6 lg:p-8">
      <Tabs defaultValue="active" className="flex flex-1 flex-col overflow-hidden">
        {/* ── Tab Bar ── */}
        <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-between gap-2 bg-transparent p-0">
          {/* Tab toggles */}
          <div className="flex rounded-lg p-0.5" style={{ backgroundColor: '#e8f0e9' }}>
            <TabsTrigger
              value="active"
              className="rounded-md px-3 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:font-semibold data-[state=active]:shadow-sm"
              style={{ color: '#1a5c2a' }}
            >
              Active ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-md px-3 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:font-semibold data-[state=active]:shadow-sm"
              style={{ color: '#1a5c2a' }}
            >
              History ({completedOrders.length})
            </TabsTrigger>
          </div>

          {/* Search + Refresh */}
          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-64 lg:w-80">
              <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
              <Input placeholder="Search by name, id, or department..." className="h-9 bg-white pl-10 shadow-sm" value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-white shadow-sm" onClick={() => fetchOrders(true)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} style={{ color: '#1a5c2a' }} />
            </Button>
          </div>
        </TabsList>

        {/* ── Active Orders ── */}
        <TabsContent value="active" className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 gap-4 pb-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* ── Loading state (matches Menu page) ── */}
            {loading ? (
              <div className="col-span-full flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="h-8 w-8 animate-spin" style={{ color: '#1a5c2a' }} />
                  <p className="animate-pulse text-sm" style={{ color: '#6b7280' }}>
                    Loading orders...
                  </p>
                </div>
              </div>
            ) : activeOrders.length === 0 ? (
              <div className="col-span-full py-20 text-center text-sm" style={{ color: '#9ca3af' }}>
                No active orders found.
              </div>
            ) : (
              activeOrders.map((order) => (
                <Card key={order.order_id} className="flex flex-col transition-all hover:shadow-md" style={{ border: '1.5px solid #c9a84c', backgroundColor: '#ffffff' }}>
                  <CardHeader>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Hash className="h-3 w-3" style={{ color: '#c9a84c' }} />
                        <span className="font-mono text-xs font-bold" style={{ color: '#1a5c2a' }}>
                          {order.order_id}
                        </span>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <CardTitle className="truncate text-lg" style={{ color: '#14491f' }}>
                          {order.full_name}
                        </CardTitle>
                        <span className="shrink-0 text-xs font-semibold tracking-widest uppercase" style={{ color: '#6b7280' }}>
                          {order.department}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-4">
                    <div className="space-y-2 rounded-lg border border-dashed p-3" style={{ backgroundColor: '#f5fbf6', borderColor: '#b8d9be' }}>
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span>
                            <span className="font-bold">{item.quantity}x</span> {item.item_name_snapshot}
                          </span>
                          <span style={{ color: '#6b7280' }}>₱{item.price_at_order}</span>
                        </div>
                      ))}
                      <div className="mt-2 flex justify-between border-t border-dashed pt-2 font-bold" style={{ borderColor: '#b8d9be', color: '#1a5c2a' }}>
                        <span className="flex items-center gap-1">
                          <ReceiptText className="h-4 w-4" /> Total Price
                        </span>
                        <span>₱{calculateTotal(order.items).toFixed(2)}</span>
                      </div>
                    </div>
                    {order.order_remarks && (
                      <div className="rounded border border-orange-100 bg-orange-50 p-2 text-xs text-orange-800">
                        <strong>Note:</strong> {order.order_remarks}
                      </div>
                    )}
                  </CardContent>

                  <CardContent className="flex flex-col gap-2 pt-0 pb-4">
                    <div className="grid grid-cols-2 gap-2">
                      {order.status === 'pending' && (
                        <Button className="w-full bg-blue-600 text-white hover:bg-blue-700" onClick={() => updateStatus(order.order_id, 'preparing')}>
                          <Clock className="mr-2 h-4 w-4" /> Prepare
                        </Button>
                      )}
                      {order.status === 'preparing' && (
                        <Button className="w-full text-white hover:opacity-90" style={{ backgroundColor: '#1a5c2a' }} onClick={() => updateStatus(order.order_id, 'ready')}>
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
              ))
            )}
          </div>
        </TabsContent>

        {/* ── History ── */}
        <TabsContent value="history" className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 gap-4 pb-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* ── Loading state (matches Menu page) ── */}
            {loading ? (
              <div className="col-span-full flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="h-8 w-8 animate-spin" style={{ color: '#1a5c2a' }} />
                  <p className="animate-pulse text-sm" style={{ color: '#6b7280' }}>
                    Loading history...
                  </p>
                </div>
              </div>
            ) : completedOrders.length === 0 ? (
              <div className="col-span-full py-20 text-center text-sm" style={{ color: '#9ca3af' }}>
                No order history yet.
              </div>
            ) : (
              completedOrders.map((order) => (
                <Card key={order.order_id} className="flex flex-col opacity-90" style={{ border: '1.5px solid #c9a84c', backgroundColor: '#fafafa' }}>
                  <CardHeader>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Hash className="h-3 w-3" style={{ color: '#9ca3af' }} />
                        <span className="font-mono text-xs font-bold" style={{ color: '#6b7280' }}>
                          {order.order_id}
                        </span>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <CardTitle className="truncate text-lg" style={{ color: '#374151' }}>
                          {order.full_name}
                        </CardTitle>
                        <span className="shrink-0 text-xs font-medium tracking-wider uppercase" style={{ color: '#9ca3af' }}>
                          {order.department}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-4">
                    <div className="space-y-2 rounded-lg border border-dashed p-3" style={{ backgroundColor: '#f5fbf6', borderColor: '#e5e7eb' }}>
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span>
                            <span className="font-bold">{item.quantity}x</span> {item.item_name_snapshot}
                          </span>
                          <span style={{ color: '#9ca3af' }}>₱{item.price_at_order}</span>
                        </div>
                      ))}
                      <div className="mt-2 flex justify-between border-t border-dashed pt-2 font-bold" style={{ borderColor: '#e5e7eb', color: '#374151' }}>
                        <span className="flex items-center gap-1">
                          <ReceiptText className="h-4 w-4" /> Total Paid
                        </span>
                        <span>₱{calculateTotal(order.items).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-1 border-t pt-2 text-[11px]" style={{ borderColor: '#e5e7eb', color: '#9ca3af' }}>
                      <p>Order Placed: {new Date(order.order_time).toLocaleString()}</p>
                      {order.status === 'picked_up' && (
                        <p className="flex items-center gap-1 font-medium text-green-600 italic">
                          <CheckCircle2 className="h-3 w-3" />
                          Completed: {order.completed_at ? new Date(order.completed_at).toLocaleString() : 'N/A'}
                        </p>
                      )}
                      {order.status === 'cancelled' && (
                        <p className="flex items-center gap-1 font-medium text-red-600 italic">
                          <XCircle className="h-3 w-3" />
                          Cancelled: {order.cancelled_at ? new Date(order.cancelled_at).toLocaleString() : 'N/A'}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
