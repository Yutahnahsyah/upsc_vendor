'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { User, RectangleEllipsis } from 'lucide-react';

export default function VendorLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const navigate = useNavigate();

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

      // Success: Store the goods
      localStorage.setItem('vendorToken', data.token);
      localStorage.setItem('stallId', data.stall_id.toString());

      return data;
    };

    toast.promise(loginAction(), {
      loading: 'Verifying administrative access...',
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-slate-100 bg-white p-8 shadow-md">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Vendor Access</h1>
          <p className="text-muted-foreground text-sm">Login using your vendor credentials.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Username</label>
            <div className="relative">
              <User className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
              <Input name="username" className="pl-9" placeholder="Enter your username here..." value={formData.username} onChange={handleInputChange} required />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <div className="relative">
              <RectangleEllipsis className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
              <Input name="password" type="password" className="pl-9" placeholder="••••••••" value={formData.password} onChange={handleInputChange} required />
            </div>
          </div>

          <Button type="submit" className="w-full bg-[#111] transition-all hover:bg-black" disabled={isLoading}>
            {isLoading ? 'Authenticating...' : 'Login to Dashboard'}
          </Button>
        </form>
      </div>
    </div>
  );
}
