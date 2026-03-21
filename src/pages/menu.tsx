import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Search, Trash2, Utensils, Banknote, RefreshCw, ImageIcon, X, Plus, Package, Minus, AlignLeft, Upload } from 'lucide-react';

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

  const apiCall = useCallback(async (endpoint: string, options: RequestInit) => {
    const token = localStorage.getItem('vendorToken');
    if (!token) throw new Error('Authentication token not found.');
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      ...((options.headers as Record<string, string>) || {}),
    };
    if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const response = await fetch(`http://localhost:3000/api${endpoint}`, { ...options, headers });
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

  const startEditing = (id: number, field: string, initialValue: any) => {
    setEditingField({ id, field });
    setTempValue(String(initialValue));
  };

  const handleBlur = async (id: number, field: string, originalValue: any) => {
    if (!editingField) return;
    const newValue = tempValue;
    setEditingField(null);
    if (newValue !== String(originalValue)) {
      let finalValue: string | number = newValue;
      if (field === 'price' || field === 'stock_qty') finalValue = Math.max(0, Number(newValue));
      handleUpdate(id, { [field]: finalValue });
    }
  };

  const handleUpdate = async (id: number, updates: Partial<MenuItem>) => {
    const promise = apiCall(`/updateItem/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
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
    /*
      On md and below: single column, form on top, grid below — both scroll naturally
      On lg+:          3-col grid, form left (col-span-1), grid right (col-span-2),
                       each side scrolls independently inside a fixed viewport height
    */
    <div className="p-4 md:p-6 lg:p-0">
      {/* ── lg layout: side-by-side with independent scroll ── */}
      <div className="flex flex-col gap-6 lg:h-[calc(100vh-66px)] lg:flex-row lg:overflow-hidden lg:p-8">
        {/* Left: Add Item Form */}
        <div className="w-full shrink-0 lg:w-72 lg:overflow-y-auto lg:pr-1 xl:w-80">
          <Card className="h-fit shadow-sm" style={{ border: '1.5px solid #c9a84c', backgroundColor: '#ffffff' }}>
            <CardHeader>
              <CardTitle style={{ color: '#1a5c2a' }}>Add Menu Item</CardTitle>
              <CardDescription>Enter dish details and upload a photo.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleAddItem} className="space-y-4">
                {/* Dish Photo */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: '#14491f' }}>
                    Dish Photo
                  </label>
                  <div className="flex justify-center">
                    <label
                      className="relative flex aspect-square w-full max-w-[150px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors hover:bg-slate-50"
                      style={{ borderColor: '#c9a84c' }}
                    >
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
                          <ImageIcon className="mb-2 h-8 w-8" style={{ color: '#c9a84c' }} />
                          <p className="text-muted-foreground text-[10px]">Click to upload image</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Dish Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: '#14491f' }}>
                    Dish Name
                  </label>
                  <div className="relative">
                    <Utensils className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                    <Input className="pl-10" placeholder="Enter dish name..." value={formData.item_name} onChange={(e) => setFormData({ ...formData, item_name: e.target.value })} required />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: '#14491f' }}>
                    Description
                  </label>
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

                {/* Price & Stock */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" style={{ color: '#14491f' }}>
                      Price (₱)
                    </label>
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
                    <label className="text-sm font-medium" style={{ color: '#14491f' }}>
                      Stock
                    </label>
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

                {/* Category */}
                <div className="space-y-1">
                  <label className="text-sm font-medium" style={{ color: '#14491f' }}>
                    Category
                  </label>
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

                <Button type="submit" className="w-full font-medium text-white transition-all hover:opacity-90" style={{ backgroundColor: '#1a5c2a' }}>
                  Save to Menu
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: Menu Grid */}
        <div className="flex flex-1 flex-col gap-4 lg:overflow-hidden">
          {/* Search & Refresh */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
              <Input placeholder="Search by name, category, or description..." className="h-9 bg-white pl-10 shadow-sm" value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-white" onClick={() => fetchMenu(true)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} style={{ color: '#1a5c2a' }} />
            </Button>
          </div>

          {/* Items grid — scrolls independently on lg */}
          <div className="overflow-y-auto pb-4 lg:flex-1">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="h-8 w-8 animate-spin" style={{ color: '#1a5c2a' }} />
                  <p className="animate-pulse text-sm" style={{ color: '#6b7280' }}>
                    Loading menu...
                  </p>
                </div>
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredItems.map((item) => (
                  <Card
                    key={item.item_id}
                    className={`relative flex flex-col gap-0 overflow-hidden p-0 transition-all hover:shadow-md ${!item.is_available && 'opacity-60'}`}
                    style={{ border: '1.5px solid #c9a84c', backgroundColor: '#ffffff' }}
                  >
                    {/* Image */}
                    <div className="group relative aspect-square w-full shrink-0 cursor-pointer overflow-hidden" style={{ backgroundColor: '#f5f9f5' }} onClick={() => handleImageClick(item.item_id)}>
                      {item.item_image_url ? (
                        <img src={`http://localhost:3000${item.item_image_url}`} alt={item.item_name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Utensils className="h-10 w-10" style={{ color: '#b8d9be' }} />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button variant="secondary" size="sm" className="gap-2">
                          <Upload className="h-4 w-4" /> Change Image
                        </Button>
                      </div>
                    </div>

                    {/* Card Header */}
                    <CardHeader className="px-4 pt-3 pb-2">
                      <div className="mb-2 flex items-center justify-between">
                        <select
                          className="cursor-pointer rounded border px-2 py-0.5 text-[12px] font-medium outline-none"
                          style={{ backgroundColor: '#f0f7f1', borderColor: '#b8d9be', color: '#14491f' }}
                          value={item.category}
                          onChange={(e) => handleUpdate(item.item_id, { category: e.target.value })}
                        >
                          <option value="Meals">Meals</option>
                          <option value="Drinks">Drinks</option>
                          <option value="Snacks">Snacks</option>
                          <option value="Desserts">Desserts</option>
                        </select>
                        <div className="w-24 cursor-pointer text-right font-bold" style={{ color: '#1a5c2a' }} onClick={() => startEditing(item.item_id, 'price', item.price)}>
                          {editingField?.id === item.item_id && editingField.field === 'price' ? (
                            <div className="flex items-center justify-end">
                              <span className="mr-0.5">₱</span>
                              <input
                                autoFocus
                                type="number"
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

                      <CardTitle className="cursor-pointer truncate text-base" style={{ color: '#14491f' }} onClick={() => startEditing(item.item_id, 'item_name', item.item_name)}>
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
                        className="hover:bg-muted/50 line-clamp-3 min-h-[3rem] cursor-pointer rounded p-1 text-xs"
                        style={{ color: '#6b7280' }}
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

                    {/* Card Content */}
                    <CardContent className="space-y-4 px-4 pt-3 pb-5">
                      <div className="flex items-center gap-0 overflow-hidden rounded-md border" style={{ borderColor: '#d4e8d4' }}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-12 shrink-0 rounded-none border-r"
                          style={{ borderColor: '#d4e8d4' }}
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-12 shrink-0 rounded-none border-l"
                          style={{ borderColor: '#d4e8d4' }}
                          onClick={() => handleUpdate(item.item_id, { stock_qty: item.stock_qty + 1 })}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="h-10 flex-1 font-medium transition-all hover:opacity-90"
                            style={item.is_available ? { backgroundColor: '#1a5c2a', color: '#fff' } : { backgroundColor: 'transparent', border: '1px solid #d1d5db', color: '#6b7280' }}
                            onClick={() => handleUpdate(item.item_id, { is_available: true })}
                          >
                            Available
                          </Button>
                          <Button
                            size="sm"
                            className="h-10 flex-1 font-medium transition-all"
                            style={!item.is_available ? { backgroundColor: '#1a5c2a', color: '#fff' } : { backgroundColor: 'transparent', border: '1px solid #d1d5db', color: '#6b7280' }}
                            onClick={() => handleUpdate(item.item_id, { is_available: false })}
                          >
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
              <div className="flex h-64 items-center justify-center text-sm" style={{ color: '#9ca3af' }}>
                No items found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
