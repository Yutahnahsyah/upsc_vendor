import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImageIcon, Upload, Loader2 } from 'lucide-react';
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
    <div className="p-4 md:p-6 lg:p-8">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        {/* LEFT: Cover Photo */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden shadow-sm" style={{ border: '1.5px solid #c9a84c', backgroundColor: '#ffffff' }}>
            <CardContent className="space-y-4 pt-5">
              <label className="text-sm font-semibold" style={{ color: '#14491f' }}>
                Cover Photo
              </label>
              <div
                className="group relative flex h-48 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors md:h-56 lg:h-64"
                style={{ borderColor: '#c9a84c', backgroundColor: '#f5fbf6' }}
                onClick={() => fileInputRef.current?.click()}
              >
                {preview || stall?.stall_image_url ? (
                  <img src={preview || `http://localhost:3000${stall?.stall_image_url}`} className="h-full w-full object-cover" alt="Stall Cover" />
                ) : (
                  <div className="flex flex-col items-center gap-3" style={{ color: '#9ca3af' }}>
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
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Empty stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <Card className="shadow-sm" style={{ border: '1.5px solid #c9a84c', backgroundColor: '#ffffff' }}>
            <CardContent className="flex items-center justify-between p-4" />
          </Card>
          <Card className="shadow-sm" style={{ border: '1.5px solid #c9a84c', backgroundColor: '#ffffff' }}>
            <CardContent className="flex items-center justify-between p-4" />
          </Card>
          <Card className="shadow-sm" style={{ border: '1.5px solid #c9a84c', backgroundColor: '#ffffff' }}>
            <CardContent className="flex items-center justify-between p-4" />
          </Card>
          <Card className="shadow-sm" style={{ border: '1.5px solid #c9a84c', backgroundColor: '#ffffff' }}>
            <CardContent className="flex items-center justify-between p-4" />
          </Card>
        </div>
      </div>
    </div>
  );
}
