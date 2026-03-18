import { useState, useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Utensils, ScrollText, Settings, LogOut, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { io } from 'socket.io-client';

// Initialize outside to ensure it persists across re-renders
const socket = io('http://localhost:3000', { 
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5
});

export default function VendorLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [stallName, setStallName] = useState('Loading...');
  const stallId = localStorage.getItem('stallId');

  // 1. Fetch Stall Name (Only once on mount)
  useEffect(() => {
    const fetchStallName = async () => {
      try {
        const token = localStorage.getItem('vendorToken');
        const response = await fetch('http://localhost:3000/api/vendorStall', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setStallName(data.stall_name);
        }
      } catch {
        setStallName('Error Loading');
      }
    };
    fetchStallName();
  }, []);

  // 2. Persistent Socket Connection
  useEffect(() => {
    if (!stallId) return;

    if (!socket.connected) {
      socket.connect();
      socket.emit('join_stall', stallId);
    }

    const handleNewOrder = (data: any) => {
      // Play Sound
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2575/2575-preview.mp3');
      audio.play().catch(() => console.log('Sound blocked by browser policy'));

      // Global Toast - visible on ANY page under this layout
      toast.success(`Incoming Order #${data.orderId}!`, {
        description: (
          <span className="mt-1 block font-semibold text-black">
            {data.message}
          </span>
        ),
        icon: '🔔',
        duration: 8000,
      });

      // Shouts to child pages (Orders or Dashboard) to refresh their data
      window.dispatchEvent(new CustomEvent('refresh-orders'));
    };

    socket.on('new_order_alert', handleNewOrder);

    // CRITICAL: We only remove the listener on unmount, 
    // we DON'T disconnect here to keep the line open during navigation
    return () => {
      socket.off('new_order_alert', handleNewOrder);
    };
  }, [stallId]); 

  const handleLogout = () => {
    socket.disconnect(); // ONLY disconnect on logout
    localStorage.removeItem('vendorToken');
    localStorage.removeItem('stallId');
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="fixed hidden h-full w-64 flex-col border-r bg-white md:flex">
        <div className="border-b p-6">
          <h2 className="text-primary text-xl font-bold">UPSmart Canteen</h2>
          <div className="mt-2 flex items-center gap-2 text-slate-600">
            <Store size={16} className="text-orange-500" />
            <span className="truncate text-sm font-medium">{stallName}</span>
          </div>
        </div>
        <nav className="flex-1 space-y-2 p-4">
          <Button variant={isActive('/dashboard') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => navigate('/dashboard')}>
            <LayoutDashboard size={20} /> Dashboard
          </Button>
          <Button variant={isActive('/menu') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => navigate('/menu')}>
            <Utensils size={20} /> Menu Management
          </Button>
          <Button variant={isActive('/orders') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => navigate('/orders')}>
            <ScrollText size={20} /> Order Management
          </Button>
          <Button variant={isActive('/settings') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => navigate('/settings')}>
            <Settings size={20} /> Stall Settings
          </Button>
        </nav>
        <div className="border-t p-4">
          <Button variant="destructive" className="w-full gap-2" onClick={handleLogout}>
            <LogOut size={20} /> Logout
          </Button>
        </div>
      </aside>

      <main className="ml-64 flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}