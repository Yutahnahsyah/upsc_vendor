import { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Utensils, ScrollText, Settings, LogOut, Store, ShieldUser, ChevronRight, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
});

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Stall Overview',
  '/menu': 'Menu Management',
  '/orders': 'Order Management',
  '/settings': 'Settings',
};

export default function VendorLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [stallName, setStallName] = useState('Loading...');
  const [stallLocation, setStallLocation] = useState('Loading...');
  const [isOpen, setIsOpen] = useState(false);
  const [isTogglingOpen, setIsTogglingOpen] = useState(false);
  const [isLoadingStall, setIsLoadingStall] = useState(true);
  const [vendorName, setVendorName] = useState('Loading...');
  const stallId = localStorage.getItem('stallId');

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'UPSmart Canteen';

  const handleLogout = useCallback(() => {
    socket.disconnect();
    localStorage.removeItem('vendorToken');
    localStorage.removeItem('stallId');
    navigate('/');
  }, [navigate]);

  useEffect(() => {
    if (!stallId) return;

    const refreshData = async () => {
      try {
        const token = localStorage.getItem('vendorToken');
        const response = await fetch('http://localhost:3000/api/vendorStall', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();

          if (data.is_active === false) {
            toast.error('Account deactivated. Please contact the administrator.');
            handleLogout();
            return;
          }

          setStallName(data.stall_name);
          setStallLocation(data.location);
          setIsOpen(data.is_open);
          setVendorName(data.full_name);
        }
      } catch (error) {
        console.error('Refresh error:', error);
        setStallName('Error Loading');
      } finally {
        setIsLoadingStall(false);
      }
    };

    refreshData();

    if (!socket.connected) {
      socket.connect();
    }

    const joinRoom = () => {
      console.log('Joining room:', `stall_${stallId}`);
      socket.emit('join_stall', stallId);
    };

    socket.on('connect', joinRoom);
    if (socket.connected) joinRoom();

    socket.on('stall_updated', () => {
      console.log('📡 Stall/Vendor update received');
      refreshData();
    });

    socket.on('vendor_kicked', () => {
      console.log('📡 Kick signal received');
      toast.error('Session expired or account deactivated.');
      handleLogout();
    });

    const handleNewOrder = (data: any) => {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2575/2575-preview.mp3');
      audio.play().catch(() => {});
      toast.success(`Incoming Order #${data.orderId}!`, {
        description: <span className="mt-1 block font-semibold text-black">{data.message}</span>,
        icon: '🔔',
        duration: 8000,
      });
      window.dispatchEvent(new CustomEvent('refresh-orders'));
    };

    socket.on('new_order_alert', handleNewOrder);

    return () => {
      socket.off('connect', joinRoom);
      socket.off('stall_updated');
      socket.off('vendor_kicked');
      socket.off('new_order_alert', handleNewOrder);
    };
  }, [stallId, handleLogout]);

  const handleToggleOpen = async () => {
    setIsTogglingOpen(true);
    try {
      const token = localStorage.getItem('vendorToken');
      const response = await fetch('http://localhost:3000/api/updateStallOpenStatus', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stall_id: stallId, is_open: !isOpen }),
      });

      if (response.ok) {
        setIsOpen((prev) => !prev);
        toast.success(`Stall is now ${!isOpen ? 'Open' : 'Closed'}`);
      } else {
        toast.error('Failed to update stall status');
      }
    } catch {
      toast.error('Connection error');
    } finally {
      setIsTogglingOpen(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/menu', label: 'Menu', icon: Utensils },
    { path: '/orders', label: 'Orders', icon: ScrollText },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside
        className="fixed hidden h-full flex-col overflow-hidden transition-all duration-200 md:flex md:w-16 lg:w-56"
        style={{ background: 'linear-gradient(180deg, #1a5c2a 0%, #14491f 60%, #0f3a18 100%)' }}
      >
        <div className="h-1 w-full flex-shrink-0" style={{ background: 'linear-gradient(90deg, #c9a84c, #e8c96a, #c9a84c)' }} />

        <div className="hidden flex-shrink-0 border-b border-white/10 px-5 py-5 lg:block">
          <span className="text-xs font-semibold tracking-widest text-amber-300/80 uppercase">PHINMA Education</span>
          <h2 className="mt-0.5 text-lg leading-tight font-bold text-white">UPSmart Canteen</h2>
        </div>

        <div className="flex flex-shrink-0 items-center justify-center border-b border-white/10 py-4 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/20">
            <Store className="h-4 w-4 text-amber-300" />
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
          <p className="mb-2 hidden px-3 text-[10px] font-bold tracking-widest text-white/30 uppercase lg:block">Navigation</p>

          {navItems.map(({ path, label, icon: Icon }) => {
            const active = isActive(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                title={label}
                className={`group flex w-full items-center rounded-xl px-2 py-2.5 text-sm font-medium transition-all duration-150 lg:justify-between lg:px-3 ${
                  active ? 'border border-white/20 bg-white/15 text-white shadow-sm' : 'border border-transparent text-white/60 hover:bg-white/8 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${active ? 'bg-amber-400/25' : 'bg-transparent group-hover:bg-white/10'}`}>
                    <Icon className={`h-4 w-4 ${active ? 'text-amber-300' : 'text-white/60 group-hover:text-white'}`} />
                  </div>
                  <span className="hidden lg:inline">{label}</span>
                </div>
                {active && <ChevronRight className="hidden h-3.5 w-3.5 text-amber-300/70 lg:block" />}
              </button>
            );
          })}
        </nav>

        <div className="flex-shrink-0 border-t border-white/10 p-2 lg:p-4">
          <button
            onClick={handleLogout}
            title="Logout"
            className="group flex w-full items-center justify-center gap-3 rounded-xl border border-transparent px-2 py-2.5 text-sm font-medium text-white/60 transition-all hover:border-red-400/20 hover:bg-red-500/20 hover:text-red-300 lg:justify-start lg:px-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-transparent transition-all group-hover:bg-red-500/20">
              <LogOut className="h-4 w-4" />
            </div>
            <span className="hidden lg:inline">Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col md:ml-16 lg:ml-56">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3" style={{ backgroundColor: '#ffffff', borderColor: '#e8d99a' }}>
          <div>
            <h1 className="text-xl font-bold tracking-tight lg:text-2xl" style={{ color: '#1a5c2a' }}>
              {pageTitle}
            </h1>
            <div className="mt-0.5 h-0.5 rounded-full" style={{ width: `${pageTitle.length * 10}px`, background: 'linear-gradient(90deg, #c9a84c, #e8c96a, transparent)' }} />
          </div>

          <div className="flex flex-col items-end gap-2 lg:flex-row lg:items-center lg:gap-3">
            {/* is_open toggle badge */}
            {!isLoadingStall && (
              <button
                onClick={handleToggleOpen}
                disabled={isTogglingOpen}
                className="flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-all hover:opacity-80 disabled:opacity-50"
                style={{
                  backgroundColor: isOpen ? '#f0fdf4' : '#fef2f2',
                  borderColor: isOpen ? '#86efac' : '#fca5a5',
                }}
              >
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border"
                  style={{
                    backgroundColor: isOpen ? '#dcfce7' : '#fee2e2',
                    borderColor: isOpen ? '#4ade80' : '#f87171',
                  }}
                >
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: isOpen ? '#16a34a' : '#dc2626' }} />
                </div>
                <div className="text-left leading-tight">
                  <p className="text-[9px] font-medium" style={{ color: '#9ca3af' }}>
                    Stall Status
                  </p>
                  <p className="text-xs font-bold" style={{ color: isOpen ? '#15803d' : '#b91c1c' }}>
                    {isTogglingOpen ? 'Updating...' : isOpen ? 'Open' : 'Closed'}
                  </p>
                </div>
              </button>
            )}

            {/* Stall name badge */}
            <div className="flex items-center gap-2 rounded-xl border px-3 py-1.5" style={{ backgroundColor: '#faf6eb', borderColor: '#c9a84c' }}>
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border" style={{ backgroundColor: '#f0f7f1', borderColor: '#c9a84c' }}>
                <Store className="h-3.5 w-3.5" style={{ color: '#1a5c2a' }} />
              </div>
              <div className="leading-tight">
                <p className="text-[9px] font-medium" style={{ color: '#9ca3af' }}>
                  Stall
                </p>
                <p className="text-xs font-bold" style={{ color: '#14491f' }}>
                  {stallName}
                </p>
              </div>
            </div>

            {/* Location badge */}
            {stallLocation && (
              <div className="flex items-center gap-2 rounded-xl border px-3 py-1.5" style={{ backgroundColor: '#faf6eb', borderColor: '#c9a84c' }}>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border" style={{ backgroundColor: '#f0f7f1', borderColor: '#c9a84c' }}>
                  <MapPin className="h-3.5 w-3.5" style={{ color: '#1a5c2a' }} />
                </div>
                <div className="leading-tight">
                  <p className="text-[9px] font-medium" style={{ color: '#9ca3af' }}>
                    Location
                  </p>
                  <p className="text-xs font-bold" style={{ color: '#14491f' }}>
                    {stallLocation}
                  </p>
                </div>
              </div>
            )}

            <div className="hidden h-8 w-px lg:block" style={{ backgroundColor: '#e8d99a' }} />

            {/* Vendor badge */}
            <div className="flex items-center gap-2 rounded-xl border px-3 py-1.5" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border" style={{ backgroundColor: '#dbeafe', borderColor: '#93c5fd' }}>
                <ShieldUser className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <div className="leading-tight">
                <p className="text-[9px] font-medium" style={{ color: '#9ca3af' }}>
                  Logged in as
                </p>
                <p className="text-xs font-bold text-blue-700">{vendorName}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1" style={{ backgroundColor: '#f0f7f1' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
