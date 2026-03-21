import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImageIcon, Upload, Store, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const [stall, setStall] = useState<any>(null);
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
      // Fetch both stall details and dashboard stats
      const [stallData] = await Promise.all([apiCall('/vendorStall', { method: 'GET' })]);

      setStall(stallData.stall || stallData);
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

    // Inside handleFileChange in Settings.tsx
    toast.promise(promise, {
      loading: 'Uploading cover photo...',
      success: (data) => {
        // Ensure you are setting the stall state with the nested stall object if your API returns { stall: {...} }
        const updatedStall = data.stall || data;
        setStall(updatedStall);

        // Clear the local blob preview so it switches to the permanent URL
        setPreview(null);

        return 'Cover photo updated';
      },
      error: 'Failed to upload image',
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
      </header>

      {/* Main Grid Container: 2/3 for Settings, 1/3 for Stats */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        {/* LEFT SIDE: Settings Form */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden">
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border bg-slate-50 shadow-sm">
                  <Store className="h-6 w-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg leading-none font-bold">{stall?.stall_name || 'Stall Name'}</span>
                  <span className="text-muted-foreground mt-1 text-sm">{stall?.location || 'Location'}</span>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold">Cover Photo</label>
                <div
                  className="group border-muted-foreground/20 relative flex h-64 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-slate-50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {preview || stall?.stall_image_url ? (
                    <img src={preview || `http://localhost:3000${stall?.stall_image_url}`} className="h-full w-full object-cover" alt="Stall Cover" />
                  ) : (
                    <div className="text-muted-foreground flex flex-col items-center gap-3">
                      <div className="rounded-full bg-white p-4 shadow-sm">
                        <ImageIcon className="h-8 w-8" />
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
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT SIDE: Dashboard Statistics */}
        <div className="space-y-4">
          <Card>
            <CardContent className="flex items-center justify-between p-4"></CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between p-4"></CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between p-4"></CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between p-4"></CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
