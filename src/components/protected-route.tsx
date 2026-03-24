import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const ProtectedRoute = () => {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(true);
  const location = useLocation();

  const token = localStorage.getItem('vendorToken');

  useEffect(() => {
    const checkAccountStatus = async () => {
      if (!token) {
        setIsValid(false);
        setIsVerifying(false);
        return;
      }

      try {
        const response = await fetch('http://localhost:3000/api/vendorStall', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 403) {
          const data = await response.json();
          if (data.message.includes('archived')) {
            toast.error('', {
              description: <span className="mt-1 block font-semibold text-black">Your account has been archived by the administrator.</span>,
            });
            localStorage.clear();
            setIsValid(false);
          }
        } else if (!response.ok) {
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

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (isVerifying) {
    return null;
  }

  return isValid ? <Outlet /> : <Navigate to="/" replace />;
};

export default ProtectedRoute;
