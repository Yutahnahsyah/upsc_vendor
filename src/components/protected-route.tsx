import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const ProtectedRoute = () => {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(true);
  const location = useLocation();

  // Check for the token immediately
  const token = localStorage.getItem('vendorToken');

  useEffect(() => {
    const checkAccountStatus = async () => {
      if (!token) {
        setIsValid(false);
        setIsVerifying(false);
        return;
      }

      try {
        // We call a simple protected endpoint (like your dashboard stats or profile)
        // Your new middleware will handle the is_active check
        const response = await fetch('http://localhost:3000/api/vendorStall', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 403) {
          const data = await response.json();
          // If the middleware blocked it due to archiving
          if (data.message.includes('archived')) {
            toast.error('', {
              description: <span className="mt-1 block font-semibold text-black">Your account has been archived by the administrator.</span>,
            });
            localStorage.clear();
            setIsValid(false);
          }
        } else if (!response.ok) {
          // Other errors (token expired, etc.)
          localStorage.clear();
          setIsValid(false);
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
      } finally {
        setIsVerifying(false);
      }
    };

    checkAccountStatus();
  }, [token, location.pathname]);

  // 1. Instant check: If no token at all, don't even wait for the fetch
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // 2. While fetching the status, we show nothing (or a small loading spinner)
  // This prevents the "Flash of Archived Content"
  if (isVerifying) {
    return null;
  }

  // 3. Final decision
  return isValid ? <Outlet /> : <Navigate to="/" replace />;
};

export default ProtectedRoute;
