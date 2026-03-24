import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import VendorLayout from './components/vendor-layout';
import ProtectedRoute from './components/protected-route';
import VendorLogin from './components/vendor-login';
import Dashboard from './pages/dashboard';
import Menu from './pages/menu';
import Orders from './pages/orders';
import Settings from './pages/settings';
import { Toaster } from '@/components/ui/sonner';

function App() {
    useEffect(() => {
    const handleGlobalAuthError = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('archived') || event.reason?.message?.includes('403')) {
        localStorage.clear();
        window.location.href = '/?session=expired';
      }
    };

    window.addEventListener('unhandledrejection', handleGlobalAuthError);
    return () => window.removeEventListener('unhandledrejection', handleGlobalAuthError);
  }, []);
  return (
    <Router>
      <Routes>
        <Route path="/" element={<VendorLogin />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<VendorLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;
