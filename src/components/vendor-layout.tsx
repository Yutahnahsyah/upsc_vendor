import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Utensils, History, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VendorLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('vendorToken');
    navigate('/');
  };

  // Helper to check if a link is active
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar - Remains Static */}
      <aside className="fixed hidden h-full w-64 flex-col border-r bg-white md:flex">
        <div className="border-b p-6">
          <h2 className="text-primary text-xl font-bold">UPSmart Canteen</h2>
        </div>
        <nav className="flex-1 space-y-2 p-4">
          <Button variant={isActive('/dashboard') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => navigate('/dashboard')}>
            <LayoutDashboard size={20} /> Dashboard
          </Button>
          <Button
            variant={isActive('/menu') ? 'secondary' : 'ghost'} // Add the active state
            className="w-full justify-start gap-2"
            onClick={() => navigate('/menu')} // Add the navigation logic
          >
            <Utensils size={20} /> Menu Management
          </Button>
          <Button variant={isActive('/history') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => navigate('/orders')}>
            <History size={20} /> Order Management
          </Button>
        </nav>
        <div className="border-t p-4">
          <Button variant="destructive" className="w-full gap-2" onClick={handleLogout}>
            <LogOut size={20} /> Logout
          </Button>
        </div>
      </aside>

      {/* Main Content - Changes based on Route */}
      <main className="ml-64 flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
