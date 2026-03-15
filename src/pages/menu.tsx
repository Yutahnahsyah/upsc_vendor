import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Search, Trash2, Utensils, Banknote, RefreshCw, ImageIcon, X, Plus, Package, Minus, AlignLeft } from 'lucide-react';

interface MenuItem {
  item_id: number;
  stall_id: number;
  item_name: string;
  category: string;
  description: string;
  price: number;
  is_available: boolean;
  stock_qty: number;
  item_image_url?: string;
}

export default function Menu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuSearch, setMenuSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingField, setEditingField] = useState<{ id: number; field: string } | null>(null);
  const [tempValue, setTempValue] = useState<string>('');

  const [formData, setFormData] = useState({
    item_name: '',
    price: '',
    category: 'Meals',
    description: '',
    stock_qty: '0',
    image: null as File | null,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const stallId = localStorage.getItem('stallId');

  // Generic API Helper
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

  const fetchMenu = useCallback(
    async (isManual = false) => {
      if (!stallId) return;
      setLoading(true);
      try {
        const data = await apiCall(`/stallMenu/${stallId}`, { method: 'GET' });
        setItems(Array.isArray(data) ? data : []);
        if (isManual) toast.success('Menu updated');
      } catch (err: any) {
        toast.error(err.message || 'Failed to load menu items');
      } finally {
        setLoading(false);
      }
    },
    [stallId, apiCall]
  );

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // Editing Handlers
  const startEditing = (id: number, field: string, initialValue: any) => {
    setEditingField({ id, field });
    setTempValue(String(initialValue));
  };

  const handleBlur = async (id: number, field: string, originalValue: any) => {
    // If editingField is null, it means we already saved via Enter/Escape
    if (!editingField) return;

    const newValue = tempValue;
    setEditingField(null);

    if (newValue !== String(originalValue)) {
      let finalValue: string | number = newValue;
      if (field === 'price' || field === 'stock_qty') {
        finalValue = Math.max(0, Number(newValue));
      }
      handleUpdate(id, { [field]: finalValue });
    }
  };

  const handleUpdate = async (id: number, updates: Partial<MenuItem>) => {
    const promise = apiCall(`/updateItem/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });

    toast.promise(promise, {
      loading: 'Updating...',
      success: (data) => {
        setItems((prev) => prev.map((item) => (item.item_id === id ? { ...item, ...updates } : item)));
        return data.message;
      },
      error: (err) => err.message || 'Update failed',
    });
  };

  const handleImageClick = (itemId: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const data = new FormData();
        data.append('image', file);
        const promise = apiCall(`/updateItem/${itemId}`, { method: 'PATCH', body: data });

        toast.promise(promise, {
          loading: 'Uploading new image...',
          success: (res) => {
            setItems((prev) => prev.map((item) => (item.item_id === itemId ? { ...item, item_image_url: res.item.item_image_url } : item)));
            return res.message || 'Image updated successfully';
          },
          error: (err) => err.message,
        });
      }
    };
    input.click();
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(formData.price) < 0 || Number(formData.stock_qty) < 0) {
      toast.error('Price and Stock cannot be negative.');
      return;
    }

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null) data.append(key, value as any);
    });
    data.append('stall_id', String(stallId));

    const promise = apiCall('/addItem', { method: 'POST', body: data });

    toast.promise(promise, {
      loading: 'Adding menu item...',
      success: (res) => {
        setFormData({ item_name: '', price: '', category: 'Meals', description: '', stock_qty: '0', image: null });
        setImagePreview(null);
        fetchMenu();
        return res.message;
      },
      error: (err) => err.message,
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    const promise = apiCall(`/deleteItem/${id}`, { method: 'DELETE' });

    toast.promise(promise, {
      loading: 'Deleting...',
      success: (data) => {
        setItems((prev) => prev.filter((item) => item.item_id !== id));
        return data.message;
      },
      error: (err) => err.message,
    });
  };

  const filteredItems = useMemo(
    () => items.filter((item) => [item.item_name, item.category, item.description].some((field) => field?.toLowerCase().includes(menuSearch.toLowerCase()))),
    [items, menuSearch]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFormData((prev) => ({ ...prev, image: null }));
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col space-y-6 overflow-hidden">
      <header className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Menu Management</h1>
          <p className="text-muted-foreground">Manage your stall offerings and availability.</p>
        </div>
      </header>

      <div className="grid flex-1 gap-6 overflow-hidden lg:grid-cols-3">
        {/* Left: Form Sidebar */}
        <div className="flex shrink-0 flex-col overflow-y-auto pr-2">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Add Menu Item</CardTitle>
              <CardDescription>Enter dish details and upload a photo.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Dish Photo</label>
                  <div className="flex justify-center">
                    <label className="relative flex aspect-square w-full max-w-[150px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-200 transition-colors hover:bg-slate-50">
                      <input type="file" ref={fileInputRef} className="sr-only" accept="image/*" onChange={handleFileChange} />
                      {imagePreview ? (
                        <div className="relative h-full w-full">
                          <img src={imagePreview} className="h-full w-full object-cover" alt="Preview" />
                          <div className="absolute top-1 right-1 z-30">
                            <Button type="button" variant="destructive" size="icon" className="h-6 w-6 rounded-full" onClick={clearImage}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                          <ImageIcon className="text-muted-foreground mb-2 h-8 w-8" />
                          <p className="text-muted-foreground text-[10px]">Click to upload image</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Dish Name</label>
                  <div className="relative">
                    <Utensils className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                    <Input className="pl-10" placeholder="e.g. Pork Sisig" value={formData.item_name} onChange={(e) => setFormData({ ...formData, item_name: e.target.value })} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <div className="relative">
                    <AlignLeft className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                    <Textarea
                      className="min-h-[80px] pt-2 pl-10 text-sm"
                      placeholder="Briefly describe the dish..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Price (₱)</label>
                    <div className="relative">
                      <Banknote className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                      <Input
                        className="[appearance:textfield] pl-10 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Stock</label>
                    <div className="relative">
                      <Package className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                      <Input
                        className="pl-10 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.stock_qty}
                        onChange={(e) => setFormData({ ...formData, stock_qty: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-">
                  <label className="text-sm font-medium">Category</label>
                  <select
                    className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Meals">Meals</option>
                    <option value="Drinks">Drinks</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>

                <Button type="submit" className="w-full">
                  Save to Menu
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: Menu Grid */}
        <div className="flex flex-col space-y-4 overflow-hidden lg:col-span-2">
          {/* Search and Refresh Row */}
          <div className="flex shrink-0 items-center gap-2 p-1">
            <div className="max-w-xxl relative flex-1">
              <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
              <Input placeholder="Search dishes..." className="pl-10 transition-all focus-visible:ring-2" value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="icon" onClick={() => fetchMenu(true)} disabled={loading} className="shrink-0">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="custom-scrollbar flex-1 overflow-y-auto pr-2">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="text-primary/50 h-8 w-8 animate-spin" />
                  <p className="text-muted-foreground animate-pulse">Loading menu...</p>
                </div>
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="grid gap-4 pb-2 sm:grid-cols-2 xl:grid-cols-3">
                {filteredItems.map((item) => (
                  <Card key={item.item_id} className={`relative flex flex-col gap-0 overflow-hidden p-0 transition-all hover:shadow-md ${!item.is_available && 'opacity-60'}`}>
                    {/* 1. Image Section */}
                    <div className="bg-muted group relative aspect-square w-full shrink-0 cursor-pointer overflow-hidden" onClick={() => handleImageClick(item.item_id)}>
                      {item.item_image_url ? (
                        <img src={`http://localhost:3000${item.item_image_url}`} alt={item.item_name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Utensils className="text-muted-foreground h-10 w-10" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                        <Badge variant="secondary" className="bg-white/90">
                          Change Photo
                        </Badge>
                      </div>
                    </div>

                    {/* 2. Header Section */}
                    <CardHeader className="px-4 pt-3 pb-2">
                      <div className="mb-2 flex items-center justify-between">
                        <select
                          className="bg-background hover:bg-muted cursor-pointer rounded border px-2 py-0.5 text-[12px] font-medium transition-colors outline-none"
                          value={item.category}
                          onChange={(e) => handleUpdate(item.item_id, { category: e.target.value })}
                        >
                          <option value="Meals">Meals</option>
                          <option value="Drinks">Drinks</option>
                          <option value="Snacks">Snacks</option>
                          <option value="Desserts">Desserts</option>
                        </select>

                        {/* FIXED WIDTH PRICE CONTAINER to prevent layout jumping */}
                        <div className="w-24 cursor-pointer text-right font-bold text-green-600" onClick={() => startEditing(item.item_id, 'price', item.price)}>
                          {editingField?.id === item.item_id && editingField.field === 'price' ? (
                            <div className="flex items-center justify-end">
                              <span className="mr-0.5">₱</span>
                              <input
                                autoFocus
                                type="number"
                                // select() ensures all text is highlighted on focus
                                onFocus={(e) => e.target.select()}
                                className="w-full [appearance:textfield] bg-transparent text-right outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                onBlur={() => handleBlur(item.item_id, 'price', item.price)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleBlur(item.item_id, 'price', item.price);
                                }}
                              />
                            </div>
                          ) : (
                            <span className="hover:underline">₱{item.price}</span>
                          )}
                        </div>
                      </div>

                      <CardTitle className="hover:text-primary cursor-pointer truncate text-base" onClick={() => startEditing(item.item_id, 'item_name', item.item_name)}>
                        {editingField?.id === item.item_id && editingField.field === 'item_name' ? (
                          <input
                            autoFocus
                            onFocus={(e) => e.target.select()}
                            className="w-full border-b bg-transparent outline-none"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => handleBlur(item.item_id, 'item_name', item.item_name)}
                          />
                        ) : (
                          item.item_name
                        )}
                      </CardTitle>

                      <div
                        className="text-muted-foreground hover:bg-muted/50 line-clamp-3 min-h-[3rem] cursor-pointer rounded p-1 text-xs"
                        onClick={() => startEditing(item.item_id, 'description', item.description)}
                      >
                        {editingField?.id === item.item_id && editingField.field === 'description' ? (
                          <textarea
                            autoFocus
                            onFocus={(e) => e.target.select()}
                            className="w-full rounded border bg-transparent p-1 text-xs outline-none"
                            rows={3}
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => handleBlur(item.item_id, 'description', item.description)}
                          />
                        ) : (
                          item.description || 'No description provided.'
                        )}
                      </div>
                    </CardHeader>

                    {/* 3. Content Section */}
                    <CardContent className="space-y-4 px-4 pt-0 pb-5">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-0 overflow-hidden rounded-md border">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-12 shrink-0 rounded-none border-r"
                            onClick={() => handleUpdate(item.item_id, { stock_qty: Math.max(0, item.stock_qty - 1) })}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            onFocus={(e) => e.target.select()}
                            className="h-10 [appearance:textfield] rounded-none border-0 text-center text-sm focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            value={item.stock_qty}
                            onChange={(e) => handleUpdate(item.item_id, { stock_qty: Math.max(0, parseInt(e.target.value) || 0) })}
                          />
                          <Button variant="ghost" size="icon" className="h-10 w-12 shrink-0 rounded-none border-l" onClick={() => handleUpdate(item.item_id, { stock_qty: item.stock_qty + 1 })}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant={item.is_available ? 'default' : 'outline'} className="h-10 flex-1" onClick={() => handleUpdate(item.item_id, { is_available: true })}>
                            Available
                          </Button>
                          <Button size="sm" variant={!item.is_available ? 'default' : 'outline'} className="h-10 flex-1" onClick={() => handleUpdate(item.item_id, { is_available: false })}>
                            Unavailable
                          </Button>
                        </div>
                        <Button variant="ghost" className="text-destructive hover:bg-destructive/10 h-10 w-full" onClick={() => handleDelete(item.item_id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Item
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground flex h-64 items-center justify-center">No items found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
