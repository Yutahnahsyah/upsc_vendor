import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import VendorLayout from "./components/vendor-layout";
import ProtectedRoute from "./components/protected-route";
import VendorLogin from "./components/vendor-login";
import Dashboard from "./pages/dashboard";
import Menu from "./pages/menu";
import Orders from "./pages/orders";
import Settings from "./pages/settings";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Login Page */}
        <Route path="/" element={<VendorLogin />} />

        {/* 1. Check if logged in */}
        <Route element={<ProtectedRoute />}>
          {/* 2. Wrap these in the Sidebar Layout */}
          <Route element={<VendorLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        {/* Fallback for 404s */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;
