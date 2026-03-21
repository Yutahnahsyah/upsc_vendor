'use client';

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { toast } from 'sonner';
import { User, RectangleEllipsis, Store } from 'lucide-react';

export default function VendorLogin() {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const navigate = useNavigate();

  useEffect(() => {
    if (searchParams.get('session') === 'expired') {
      toast.error('Your account has been archived. Access denied.', {
        description: 'Please contact the head administrator for assistance.',
        duration: 5000,
      });
    }
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.username.length < 2) return toast.error('Username is too short');
    if (formData.password.length < 6) return toast.error('Password must be at least 6 characters');

    setIsLoading(true);

    const loginAction = async () => {
      const response = await fetch('http://localhost:3000/api/loginVendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Authentication failed');

      localStorage.setItem('vendorToken', data.token);
      localStorage.setItem('stallId', data.stall_id.toString());

      return data;
    };

    toast.promise(loginAction(), {
      loading: 'Verifying vendor access...',
      success: () => {
        setIsLoading(false);
        navigate('/dashboard');
        return 'Login Successful';
      },
      error: (err) => {
        setIsLoading(false);
        return err.message;
      },
    });
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: '#f0f7f1' }}
    >
      <div
        className="w-full max-w-md space-y-6 rounded-xl p-8 shadow-md"
        style={{ backgroundColor: '#ffffff', border: '1.5px solid #c9a84c' }}
      >
        {/* Gold top accent line */}
        <div
          className="-mx-8 -mt-8 mb-6 h-1 rounded-t-xl"
          style={{ background: 'linear-gradient(90deg, #c9a84c, #e8c96a, #c9a84c)' }}
        />

        {/* Header */}
        <div className="space-y-3 text-center">
          {/* Store icon badge */}
          <div className="flex justify-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl border"
              style={{ backgroundColor: '#f0f7f1', borderColor: '#c9a84c' }}
            >
              <Store className="h-7 w-7" style={{ color: '#1a5c2a' }} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#c9a84c' }}>
              PHINMA Education
            </p>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a5c2a' }}>
              UPSmart Canteen
            </h1>
          </div>

          {/* Gold divider */}
          <div
            className="mx-auto h-0.5 w-64 rounded-full"
            style={{ background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)' }}
          />

          <p className="text-sm" style={{ color: '#6b7280' }}>
            Login using your vendor credentials.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: '#14491f' }}>
              Username
            </label>
            <div className="relative">
              <User className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
              <Input
                name="username"
                className="pl-9"
                placeholder="Enter your username here..."
                value={formData.username}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: '#14491f' }}>
              Password
            </label>
            <PasswordInput
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleInputChange}
              required
              leftIcon={<RectangleEllipsis className="h-4 w-4" />}
            />
          </div>

          <Button
            type="submit"
            className="w-full font-medium text-white transition-all hover:opacity-90"
            style={{ backgroundColor: '#1a5c2a' }}
            disabled={isLoading}
          >
            {isLoading ? 'Authenticating...' : 'Login to Dashboard'}
          </Button>
        </form>
      </div>
    </div>
  );
}