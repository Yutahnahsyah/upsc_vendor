import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  // Check if the token exists in localStorage
  const token = localStorage.getItem('vendorToken');

  // If no token, redirect to login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // If token exists, render the child routes (Dashboard, etc.)
  return <Outlet />;
};

export default ProtectedRoute;
