import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ImageIcon, Upload, Loader2, PhilippinePeso, CheckCircle, XCircle, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StallStats {
  totalEarnings: number;
  totalCompleted: number;
  totalCancelled: number;
  totalOrders: number;
}

export default function Settings() {
  const [stall, setStall] = useState<any>(null);
  const [stats, setStats] = useState<StallStats | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const apiCall = useCallback(async (endpoint: string, options: RequestInit) => {
    const token = localStorage.getItem('vendorToken');
    if (!token) throw new Error('Authentication token not found.');

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      ...((options.headers as Record<string, string>) || {}),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`http://localhost:3000/api${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'An error occurred');
    return data;
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [stallData, statsData] = await Promise.all([apiCall('/vendorStall', { method: 'GET' }), apiCall('/stallStats', { method: 'GET' })]);
      setStall(stallData.stall || stallData);
      setStats(statsData);
    } catch {
      toast.error('Failed to load settings and statistics');
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    const formData = new FormData();
    formData.append('image', file);

    const promise = apiCall(`/stalls/update/${localStorage.getItem('stallId')}`, {
      method: 'PATCH',
      body: formData,
    });

    toast.promise(promise, {
      loading: 'Uploading cover photo...',
      success: (data) => {
        const updatedStall = data.stall || data;
        setStall(updatedStall);
        setPreview(null);
        return 'Cover photo updated';
      },
      error: 'Failed to upload image',
    });
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#1a5c2a' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* TOP: 4 Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Earnings"
          value={`₱${Number(stats?.totalEarnings ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<PhilippinePeso className="h-5 w-5" style={{ color: '#1a5c2a' }} />}
        />
        <StatCard label="Total Orders" value={stats?.totalOrders.toString() ?? '0'} icon={<ShoppingBag className="h-5 w-5" style={{ color: '#1a5c2a' }} />} />
        <StatCard label="Completed" value={stats?.totalCompleted.toString() ?? '0'} icon={<CheckCircle className="h-5 w-5" style={{ color: '#1a5c2a' }} />} />
        <StatCard label="Cancelled" value={stats?.totalCancelled.toString() ?? '0'} icon={<XCircle className="h-5 w-5 text-red-500" />} />
      </div>

      {/* BOTTOM: Cover Photo Banner */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold" style={{ color: '#14491f' }}>
            Cover Photo
          </label>
          <span className="text-xs" style={{ color: '#9ca3af' }}>
            Click image to change
          </span>
        </div>
        <div
          className="group relative w-full cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-colors"
          style={{ borderColor: '#c9a84c', backgroundColor: '#f5fbf6', height: '320px' }}
          onClick={() => fileInputRef.current?.click()}
        >
          {preview || stall?.stall_image_url ? (
            <img src={preview || `http://localhost:3000${stall?.stall_image_url}`} className="h-full w-full object-cover" alt="Stall Cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3" style={{ color: '#9ca3af' }}>
              <div className="rounded-full bg-white p-4 shadow-sm" style={{ border: '1px solid #e8d99a' }}>
                <ImageIcon className="h-8 w-8" style={{ color: '#c9a84c' }} />
              </div>
              <p className="text-sm font-medium">Click to upload a cover photo</p>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Button variant="secondary" size="sm" className="gap-2">
              <Upload className="h-4 w-4" /> Change Image
            </Button>
          </div>
        </div>
      </div>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="shadow-sm transition-shadow hover:shadow-md" style={{ border: '1.5px solid #c9a84c', backgroundColor: '#ffffff' }}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium" style={{ color: '#14491f' }}>
          {label}
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
